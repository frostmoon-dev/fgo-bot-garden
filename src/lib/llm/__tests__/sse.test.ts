import { describe, expect, it } from "vitest";
import { parseSseLine, readSseDeltas } from "../sse";

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
