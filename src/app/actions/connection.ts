"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actionResult";
import { requireAuth } from "@/lib/auth/server";
import { invalidate, TAGS } from "@/lib/data/cache";
import { db } from "@/lib/db";
import { completeChat, describeFailure, modelsRequest } from "@/lib/llm/client";
import { keyFor, sameOrigin, type LlmConnection } from "@/lib/llm/connection";
import { checkBaseUrl, PROVIDERS, type ProviderId } from "@/lib/llm/providers";
import { encryptSecret } from "@/lib/llm/secret";
import { safe } from "@/lib/safeAction";

const connectionSchema = z.object({
  provider: z.enum(Object.keys(PROVIDERS) as [ProviderId, ...ProviderId[]]),
  baseUrl: z
    .string()
    .trim()
    .min(1, "Enter the provider's address")
    .max(500)
    .superRefine((value, ctx) => {
      const problem = checkBaseUrl(value);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
  model: z.string().trim().min(1, "Enter a model id, or load the list and pick one").max(200),
  // Empty keeps the saved key. The page never receives the saved key, so it can't send it back.
  apiKey: z.string().trim().max(500),
  // 1: the main model. 2: the backup.
  slot: z.union([z.literal(1), z.literal(2)]).default(1),
});
export type ConnectionInput = z.input<typeof connectionSchema>;

async function resolve(input: ConnectionInput): Promise<LlmConnection> {
  const data = connectionSchema.parse(input);
  return { baseUrl: data.baseUrl, model: data.model, apiKey: data.apiKey || (await keyFor(data.baseUrl, data.slot)) };
}

export async function saveConnection(input: ConnectionInput): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const data = connectionSchema.parse(input);
    const baseUrl = data.baseUrl.replace(/\/+$/, "");
    const id = data.slot;
    const before = await db.connection.findUnique({ where: { id }, select: { baseUrl: true } });
    // A new key replaces the old one; a new server without a key drops the old one, which belongs elsewhere.
    const apiKey = data.apiKey ? encryptSecret(data.apiKey) : before && !sameOrigin(before.baseUrl, baseUrl) ? "" : undefined;
    const fields = { provider: data.provider, baseUrl, model: data.model, ...(apiKey !== undefined && { apiKey }) };
    await db.connection.upsert({ where: { id }, update: fields, create: { id, ...fields } });
    invalidate(TAGS.connection);
    revalidatePath("/", "layout");
  });
}

// Forgets a saved connection and its key. For the main model, the LLM_* environment variables apply again, if set.
export async function removeConnection(slot: 1 | 2 = 1): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.connection.deleteMany({ where: { id: z.union([z.literal(1), z.literal(2)]).parse(slot) } });
    invalidate(TAGS.connection);
    revalidatePath("/", "layout");
  });
}

export interface TestResult {
  ms: number;
  reply: string;
}

// One tiny request with the values in the form, saved or not.
export async function testConnection(input: ConnectionInput): Promise<ActionResult<TestResult>> {
  return safe(async () => {
    await requireAuth();
    const connection = await resolve(input);
    const started = Date.now();
    try {
      const reply = await completeChat({
        connection,
        messages: [{ role: "user", content: "Reply with one short friendly word." }],
        temperature: 0,
        maxTokens: 16,
        signal: AbortSignal.timeout(30_000),
        // A test reports what is wrong right away instead of retrying.
        retry: false,
        purpose: "test",
      });
      return { ms: Date.now() - started, reply: reply.trim().slice(0, 80) };
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") throw new Error("No answer within 30 seconds.");
      if (error instanceof TypeError || (error instanceof Error && /connection to the provider broke/.test(error.message))) {
        throw new Error(`Couldn't reach ${new URL(connection.baseUrl).host}. Check the address.`);
      }
      throw error;
    }
  });
}

// The provider's model list (GET /models), for the model picker.
export async function listModels(input: Omit<ConnectionInput, "model">): Promise<ActionResult<string[]>> {
  return safe(async () => {
    await requireAuth();
    const connection = await resolve({ ...input, model: "-" });
    const { url, headers } = modelsRequest(connection);
    let res: Response;
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
    } catch {
      throw new Error(`Couldn't reach ${new URL(connection.baseUrl).host}. Check the address.`);
    }
    if (!res.ok) throw new Error(describeFailure(res.status, await res.text().catch(() => "")));
    const json = (await res.json().catch(() => null)) as { data?: { id?: unknown }[]; models?: { name?: unknown }[] } | null;
    const ids = [
      ...(json?.data ?? []).map((m) => m.id),
      // Ollama's native shape, in case the address points there.
      ...(json?.models ?? []).map((m) => m.name),
    ].filter((id): id is string => typeof id === "string" && id.length > 0);
    if (!ids.length) throw new Error("The provider returned no models. Type the model id instead.");
    return [...new Set(ids)].sort((a, b) => a.localeCompare(b)).slice(0, 1000);
  });
}
