import "server-only";
import { env } from "@/lib/env";
import { readSseDeltas } from "./sse";
import type { ChatOptions } from "./types";

async function post(options: ChatOptions, stream: boolean): Promise<Response> {
  const { LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } = env();
  const res = await fetch(`${LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream,
    }),
    signal: options.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res;
}

export async function* streamChat(options: ChatOptions): AsyncGenerator<string> {
  const res = await post(options, true);
  if (!res.body) throw new Error("LLM response has no body");
  yield* readSseDeltas(res.body);
}

export async function completeChat(options: ChatOptions): Promise<string> {
  const res = await post(options, false);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}
