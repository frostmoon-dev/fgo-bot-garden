import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../connection", () => ({ activeConnection: vi.fn() }));

const { streamChat } = await import("../client");

const connection = { baseUrl: "https://example.test/v1", apiKey: "k", model: "m" };
const ok = () =>
  new Response(
    `data: ${JSON.stringify({ choices: [{ delta: { content: "Hi" } }] })}\n\ndata: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 3, completion_tokens: 1 } })}\n\ndata: [DONE]\n\n`,
    { status: 200 },
  );

afterEach(() => vi.unstubAllGlobals());

describe("stream_options", () => {
  it("asks for usage, and retries once without it when the server refuses", async () => {
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        bodies.push(body);
        return body.stream_options ? new Response("unknown field stream_options", { status: 400 }) : ok();
      }),
    );
    let text = "";
    const onUsage = vi.fn();
    for await (const x of streamChat({ messages: [], temperature: 1, maxTokens: 10, connection, onUsage })) text += x;
    expect(text).toBe("Hi");
    expect(bodies.map((b) => !!b.stream_options)).toEqual([true, false]);
    expect(onUsage).toHaveBeenCalledWith({ promptTokens: 3, cachedTokens: null, completionTokens: 1 });

    // The refusal is remembered: the next request goes straight without it.
    bodies.length = 0;
    for await (const x of streamChat({ messages: [], temperature: 1, maxTokens: 10, connection, onUsage })) text += x;
    expect(bodies.map((b) => !!b.stream_options)).toEqual([false]);
  });
});
