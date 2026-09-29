import { RetryableError } from "./retry";
import type { ChatUsage } from "./types";

// Reads an OpenAI-compatible SSE stream and yields content deltas. Token counts, which providers send in a
// chunk of their own when asked (stream_options.include_usage), go to onUsage.
// With idleMs, a stream that sends nothing at all for that long is cancelled with a RetryableError.
export async function* readSseDeltas(
  body: ReadableStream<Uint8Array>,
  onUsage?: (usage: ChatUsage) => void,
  idleMs?: number,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const next = (): Promise<ReadableStreamReadResult<Uint8Array>> => {
    if (!idleMs) return reader.read();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const quiet = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        // Reject first: cancelling ends the pending read, which would otherwise look like a normal end.
        reject(new RetryableError(`The model stopped sending for ${Math.round(idleMs / 1000)} seconds.`));
        reader.cancel().catch(() => {});
      }, idleMs);
    });
    return Promise.race([reader.read(), quiet]).finally(() => clearTimeout(timer));
  };
  const decoder = new TextDecoder();
  let buffer = "";
  const read = (line: string) => {
    const usage = onUsage ? parseSseUsage(line) : null;
    if (usage) onUsage!(usage);
    return parseSseLine(line);
  };
  try {
    while (true) {
      const { value, done } = await next();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        const delta = read(line);
        if (delta === null) return;
        if (delta) yield delta;
      }
    }
    const tail = read(buffer.trim());
    if (tail) yield tail;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // A read cancelled by the idle timer may still be settling.
    }
  }
}

// Returns the delta text, "" for lines without content, or null for [DONE].
export function parseSseLine(line: string): string | null {
  if (!line.startsWith("data:")) return "";
  const data = line.slice(5).trim();
  if (data === "[DONE]") return null;
  try {
    const json = JSON.parse(data) as { choices?: { delta?: { content?: string | null } }[] };
    return json.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  // OpenAI, Gemini, OpenRouter, Grok, Groq…
  prompt_tokens_details?: { cached_tokens?: number } | null;
  // DeepSeek
  prompt_cache_hit_tokens?: number;
}

// Token counts from a usage object, in whichever field the provider uses for cached tokens.
export function readUsage(usage: RawUsage | null | undefined): ChatUsage | null {
  if (!usage || typeof usage.prompt_tokens !== "number") return null;
  const cached = usage.prompt_tokens_details?.cached_tokens ?? usage.prompt_cache_hit_tokens;
  return {
    promptTokens: usage.prompt_tokens,
    cachedTokens: typeof cached === "number" ? cached : null,
    completionTokens: usage.completion_tokens ?? 0,
  };
}

export function parseSseUsage(line: string): ChatUsage | null {
  if (!line.startsWith("data:") || !line.includes('"usage"')) return null;
  try {
    return readUsage((JSON.parse(line.slice(5).trim()) as { usage?: RawUsage | null }).usage);
  } catch {
    return null;
  }
}
