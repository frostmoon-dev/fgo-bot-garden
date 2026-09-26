import { describe, expect, it } from "vitest";
import { stripReasoning, stripReasoningStream } from "../reasoning";

async function run(chunks: string[]): Promise<string> {
  async function* gen() {
    yield* chunks;
  }
  let out = "";
  for await (const x of stripReasoningStream(gen())) out += x;
  return out;
}

describe("stripReasoning", () => {
  it("cuts <think> blocks and text before a lone closing tag", () => {
    expect(stripReasoning("<think>plan</think>\n[BB|smirk] Hi.")).toBe("[BB|smirk] Hi.");
    expect(stripReasoning("plan here</think>\n(Rain.)")).toBe("(Rain.)");
    expect(stripReasoning("(Rain.)")).toBe("(Rain.)");
  });
});

describe("stripReasoningStream", () => {
  it("cuts a thinking block split across deltas", async () => {
    const text = "<thinking>We need to continue the scene.</thinking>\n[BB|smirk] Hello, Senpai~ <3";
    const chunks = text.match(/[\s\S]{1,3}/g)!;
    expect(await run(chunks)).toBe("[BB|smirk] Hello, Senpai~ <3");
  });

  it("passes plain replies through unchanged", async () => {
    expect(await run(["(Rain", " falls.)\n[BB|", "smirk] a < b"])).toBe("(Rain falls.)\n[BB|smirk] a < b");
  });

  it("drops a lone closing tag", async () => {
    expect(await run(["plan</th", "ink>\n(Rain.)"])).toBe("plan\n(Rain.)");
  });
});
