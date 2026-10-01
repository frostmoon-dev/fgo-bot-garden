import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { TAGS } from "@/lib/data/cache";
import { getSettings } from "@/lib/data/queries";
import type { HelperModel } from "@/lib/types";
import { isProviderId, providerFor, type ProviderId } from "./providers";
import { decryptSecret, keyHint } from "./secret";
// Every request the client makes goes through here, so token usage is recorded from here on (Usage page).
import "@/lib/usage";

// Where replies come from. Saved on the Connection page; until then the LLM_* environment
// variables are used, so an existing .env keeps working.
export interface LlmConnection {
  baseUrl: string;
  apiKey: string;
  model: string;
}

// What the Connection page shows. The key itself never leaves the server.
export interface ConnectionView {
  source: "app" | "env" | "none";
  provider: ProviderId;
  baseUrl: string;
  model: string;
  hasKey: boolean;
  keyHint: string;
  // A key is saved but can't be decrypted (AUTH_SECRET changed).
  keyUnreadable: boolean;
  // The environment's model, shown while it is in use.
  envModel: string;
}

// Slot 1 is the main model; slot 2 the backup, used when the main one fails even after retrying.
export type ConnectionSlot = 1 | 2;

// The rows are cached with their keys still encrypted.
const savedRows = unstable_cache(
  async () =>
    db.connection.findMany({ where: { id: { in: [1, 2] } }, select: { id: true, provider: true, baseUrl: true, model: true, apiKey: true } }),
  ["connections"],
  { tags: [TAGS.connection], revalidate: 600 },
);

async function savedRow(slot: ConnectionSlot) {
  return (await savedRows()).find((r) => r.id === slot) ?? null;
}

function fromEnv(): LlmConnection | null {
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  const model = process.env.LLM_MODEL?.trim();
  return baseUrl && model ? { baseUrl, model, apiKey: process.env.LLM_API_KEY?.trim() ?? "" } : null;
}

export class NotConnectedError extends Error {
  constructor() {
    super("No AI model is connected yet. Open Connection in the menu and add one.");
  }
}

export function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

// The stored key for an address: the slot's saved key, else (main model only) the environment's. A key is only
// ever sent to the server it was saved for, so switching provider never leaks it to another one.
export async function keyFor(baseUrl: string, slot: ConnectionSlot = 1): Promise<string> {
  const row = await savedRow(slot);
  const saved = row?.apiKey && sameOrigin(row.baseUrl, baseUrl) ? decryptSecret(row.apiKey) : null;
  if (saved) return saved;
  if (slot !== 1) return "";
  const env = fromEnv();
  return env?.apiKey && sameOrigin(env.baseUrl, baseUrl) ? env.apiKey : "";
}

export async function activeConnection(): Promise<LlmConnection> {
  const row = await savedRow(1);
  if (row?.baseUrl && row.model) return { baseUrl: row.baseUrl, model: row.model, apiKey: await keyFor(row.baseUrl) };
  const env = fromEnv();
  if (!env) throw new NotConnectedError();
  return env;
}

// The small background requests the backup model takes over, by the helperModel setting. Story replies,
// written scenes and interludes are what the reader sees, so they always go to the main model.
const HELPER_JOBS: Record<HelperModel, string[]> = {
  main: [],
  light: ["scene", "choices"],
  all: ["scene", "choices", "summary", "memory"],
};

// The backup model, when the setting sends this kind of request to it and one is saved.
export async function helperConnection(purpose: string | undefined): Promise<LlmConnection | null> {
  if (!purpose) return null;
  const { helperModel } = await getSettings();
  return HELPER_JOBS[helperModel].includes(purpose) ? backupConnection() : null;
}

// The backup model, if one is saved.
export async function backupConnection(): Promise<LlmConnection | null> {
  const row = await savedRow(2);
  return row?.baseUrl && row.model ? { baseUrl: row.baseUrl, model: row.model, apiKey: await keyFor(row.baseUrl, 2) } : null;
}

export async function connectionView(slot: ConnectionSlot = 1): Promise<ConnectionView> {
  const row = await savedRow(slot);
  const env = slot === 1 ? fromEnv() : null;
  const inApp = !!(row?.baseUrl && row.model);
  const baseUrl = row?.baseUrl || env?.baseUrl || "";
  const key = row?.apiKey ? decryptSecret(row.apiKey) : null;
  return {
    source: inApp ? "app" : env ? "env" : "none",
    provider: row && isProviderId(row.provider) && row.baseUrl ? row.provider : providerFor(baseUrl),
    baseUrl,
    model: row?.model || env?.model || "",
    hasKey: !!(await keyFor(baseUrl, slot)),
    keyHint: key ? keyHint(key) : env?.apiKey ? keyHint(env.apiKey) : "",
    keyUnreadable: !!row?.apiKey && key === null,
    envModel: env?.model ?? "",
  };
}
