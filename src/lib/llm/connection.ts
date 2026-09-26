import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { TAGS } from "@/lib/data/cache";
import { isProviderId, providerFor, type ProviderId } from "./providers";
import { decryptSecret, keyHint } from "./secret";

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

// The row is cached with its key still encrypted.
const savedRow = unstable_cache(
  async () => db.connection.findUnique({ where: { id: 1 }, select: { provider: true, baseUrl: true, model: true, apiKey: true } }),
  ["connection"],
  { tags: [TAGS.connection], revalidate: 600 },
);

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

// The stored key for an address: the app's saved key, else the environment's. A key is only ever
// sent to the server it was saved for, so switching provider never leaks it to another one.
export async function keyFor(baseUrl: string): Promise<string> {
  const row = await savedRow();
  const saved = row?.apiKey && sameOrigin(row.baseUrl, baseUrl) ? decryptSecret(row.apiKey) : null;
  if (saved) return saved;
  const env = fromEnv();
  return env?.apiKey && sameOrigin(env.baseUrl, baseUrl) ? env.apiKey : "";
}

export async function activeConnection(): Promise<LlmConnection> {
  const row = await savedRow();
  if (row?.baseUrl && row.model) return { baseUrl: row.baseUrl, model: row.model, apiKey: await keyFor(row.baseUrl) };
  const env = fromEnv();
  if (!env) throw new NotConnectedError();
  return env;
}

export async function connectionView(): Promise<ConnectionView> {
  const row = await savedRow();
  const env = fromEnv();
  const inApp = !!(row?.baseUrl && row.model);
  const baseUrl = row?.baseUrl || env?.baseUrl || "";
  const key = row?.apiKey ? decryptSecret(row.apiKey) : null;
  return {
    source: inApp ? "app" : env ? "env" : "none",
    provider: row && isProviderId(row.provider) && row.baseUrl ? row.provider : providerFor(baseUrl),
    baseUrl,
    model: row?.model || env?.model || "",
    hasKey: !!(await keyFor(baseUrl)),
    keyHint: key ? keyHint(key) : env?.apiKey ? keyHint(env.apiKey) : "",
    keyUnreadable: !!row?.apiKey && key === null,
    envModel: env?.model ?? "",
  };
}
