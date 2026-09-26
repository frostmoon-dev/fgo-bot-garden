import { describe, expect, it } from "vitest";
import { parseSseLine, readSseDeltas, readUsage } from "../sse";

function streamOf(chunks: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      chunks.forEach((x) => c.enqueue(enc.encode(x)));
      c.close();
    },
  });
}

describe("parseSseLine", () => {
  it("reads delta content, ignores other lines, stops on [DONE]", () => {
    expect(parseSseLine('data: {"choices":[{"delta":{"content":"Hi"}}]}')).toBe("Hi");
    expect(parseSseLine(": keep-alive")).toBe("");
    expect(parseSseLine('data: {"choices":[{"delta":{"role":"assistant"}}]}')).toBe("");
    expect(parseSseLine("data: [DONE]")).toBeNull();
    expect(parseSseLine("data: not json")).toBe("");
  });
});

describe("readSseDeltas", () => {
  it("joins deltas split across network chunks", async () => {
    const d = (t: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;
    const all = d("[BB|smirk] ") + d("Hello") + "data: [DONE]\n\n" + d("ignored");
    const out: string[] = [];
    for await (const x of readSseDeltas(streamOf([all.slice(0, 17), all.slice(17, 60), all.slice(60)]))) out.push(x);
    expect(out.join("")).toBe("[BB|smirk] Hello");
  });
});

describe("usage", () => {
  it("reads cached tokens in OpenAI-style and DeepSeek-style usage", () => {
    expect(readUsage({ prompt_tokens: 5000, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 4096 } })).toEqual({
      promptTokens: 5000,
      cachedTokens: 4096,
      completionTokens: 300,
    });
    expect(readUsage({ prompt_tokens: 5000, completion_tokens: 300, prompt_cache_hit_tokens: 4800 })?.cachedTokens).toBe(4800);
    expect(readUsage({ prompt_tokens: 5000, completion_tokens: 300 })?.cachedTokens).toBeNull();
    expect(readUsage(null)).toBeNull();
  });

  it("passes the usage chunk at the end of a stream to onUsage, not into the text", async () => {
    const d = (t: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;
    const usage = `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 10, completion_tokens: 2, prompt_tokens_details: { cached_tokens: 8 } } })}\n\n`;
    const seen: unknown[] = [];
    let text = "";
    for await (const x of readSseDeltas(streamOf([d("Hi"), usage, "data: [DONE]\n\n"]), (u) => seen.push(u))) text += x;
    expect(text).toBe("Hi");
    expect(seen).toEqual([{ promptTokens: 10, cachedTokens: 8, completionTokens: 2 }]);
  });
});
