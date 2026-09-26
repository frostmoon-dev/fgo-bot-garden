import { STREAM_ERROR_MARKER, STREAM_USAGE_MARKER } from "@/lib/llm/protocol";
import type { ChatUsage } from "@/lib/llm/types";
import { LineBuffer } from "@/lib/parser/lineBuffer";

export interface PromptBreakdown {
  system: number;
  memory: number;
  history: number;
  notes: number;
  dropped: number;
}

export interface StreamHandlers {
  onStart: (info: {
    messageId: string;
    userMessageId: string | null;
    promptTokens: number;
    breakdown: PromptBreakdown | null;
  }) => void;
  onLine: (line: string) => void;
  // The provider's token counts, when it reports them, after the last line.
  onUsage?: (usage: ChatUsage) => void;
}

function parseBreakdown(header: string | null): PromptBreakdown | null {
  try {
    return header ? (JSON.parse(header) as PromptBreakdown) : null;
  } catch {
    return null;
  }
}

// Calls /api/chat and hands back complete lines as they arrive.
export async function runChat(
  body: { sessionId: string; action: "reply" | "regenerate"; text?: string; direction?: string },
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? `Request failed (${res.status})`);
  }
  handlers.onStart({
    messageId: res.headers.get("X-Message-Id") ?? "",
    userMessageId: res.headers.get("X-User-Message-Id") || null,
    promptTokens: Number(res.headers.get("X-Prompt-Tokens") ?? 0),
    breakdown: parseBreakdown(res.headers.get("X-Prompt-Breakdown")),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const lines = new LineBuffer();
  const emit = (text: string) => lines.push(text).forEach(handlers.onLine);
  // Hold back a few characters so a marker split across chunks is still found.
  const holdBack = Math.max(STREAM_ERROR_MARKER.length, STREAM_USAGE_MARKER.length) - 1;
  let pending = "";
  // Everything from the first marker on: an error, the token counts, or both. Never story text.
  let tail: string | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (tail !== null) {
        tail += text;
        continue;
      }
      pending += text;
      const found = [pending.indexOf(STREAM_ERROR_MARKER), pending.indexOf(STREAM_USAGE_MARKER)].filter((i) => i >= 0);
      if (found.length) {
        const at = Math.min(...found);
        emit(pending.slice(0, at));
        tail = pending.slice(at);
        pending = "";
        continue;
      }
      const safe = pending.length - holdBack;
      if (safe > 0) {
        emit(pending.slice(0, safe));
        pending = pending.slice(safe);
      }
    }
  } catch (error) {
    if (!signal.aborted) throw error;
  }

  emit(pending);
  lines.flush().forEach(handlers.onLine);
  if (tail === null) return;
  const [before, usageJson] = tail.split(STREAM_USAGE_MARKER);
  if (usageJson !== undefined) {
    try {
      handlers.onUsage?.(JSON.parse(usageJson) as ChatUsage);
    } catch {
      // Token counts are only shown in the developer overlay; a broken one is skipped.
    }
  }
  if (before.startsWith(STREAM_ERROR_MARKER)) {
    throw new Error(before.slice(STREAM_ERROR_MARKER.length).trim() || "Generation failed");
  }
}
