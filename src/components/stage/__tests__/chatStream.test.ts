import { afterEach, describe, expect, it, vi } from "vitest";
import { STREAM_ERROR_MARKER, STREAM_USAGE_MARKER } from "@/lib/llm/protocol";
import { runChat } from "../chatStream";

function reply(chunks: string[]) {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      chunks.forEach((x) => c.enqueue(enc.encode(x)));
      c.close();
    },
  });
  return new Response(body, { status: 200, headers: { "X-Message-Id": "m1" } });
}

async function run(chunks: string[]) {
  vi.stubGlobal("fetch", vi.fn(async () => reply(chunks)));
  const lines: string[] = [];
  const usage: unknown[] = [];
  let error: string | null = null;
  try {
    await runChat({ sessionId: "s", action: "reply" }, { onStart: () => {}, onLine: (l) => lines.push(l), onUsage: (u) => usage.push(u) }, new AbortController().signal);
  } catch (e) {
    error = (e as Error).message;
  }
  return { lines, usage, error };
}

afterEach(() => vi.unstubAllGlobals());

describe("runChat markers", () => {
  const counts = { promptTokens: 10, cachedTokens: 8, completionTokens: 2 };

  it("hands the token counts to onUsage and keeps them out of the story", async () => {
    const all = `[BB|smirk] Hi.\n(Rain.)${STREAM_USAGE_MARKER}${JSON.stringify(counts)}`;
    const { lines, usage, error } = await run([all.slice(0, 20), all.slice(20, 33), all.slice(33)]);
    expect(lines.join("\n")).toBe("[BB|smirk] Hi.\n(Rain.)");
    expect(usage).toEqual([counts]);
    expect(error).toBeNull();
  });

  it("still reports an error that comes before the counts", async () => {
    const { lines, usage, error } = await run([`[BB|smirk] Hi.${STREAM_ERROR_MARKER}stream failed${STREAM_USAGE_MARKER}${JSON.stringify(counts)}`]);
    expect(lines).toEqual(["[BB|smirk] Hi."]);
    expect(usage).toEqual([counts]);
    expect(error).toBe("stream failed");
  });
});
