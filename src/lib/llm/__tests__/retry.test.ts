import { afterEach, describe, expect, it, vi } from "vitest";
import { parseRetryAfter, retryDelay, RetryableError } from "../retry";
import { readSseDeltas } from "../sse";

vi.mock("server-only", () => ({}));
vi.mock("../connection", () => ({ activeConnection: vi.fn() }));

const { completeChat, streamChat } = await import("../client");

const connection = { baseUrl: "https://example.test/v1", apiKey: "k", model: "m" };
const json = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
const sse = (text: string) =>
  new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`, { status: 200 });
// "Try again now": keeps the tests fast.
const busy = (status: number) => new Response("busy", { status, headers: { "retry-after": "0" } });

afterEach(() => vi.unstubAllGlobals());

function stubFetch(...responses: (Response | Error)[]) {
  const calls = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("no more responses");
    if (next instanceof Error) throw next;
    return next;
  });
  vi.stubGlobal("fetch", calls);
  return calls;
}

describe("retry timing", () => {
  it("backs off and follows the provider's Retry-After", () => {
    expect(retryDelay(1, undefined, () => 0.5)).toBe(1000);
    expect(retryDelay(3, undefined, () => 0.5)).toBe(4000);
    expect(retryDelay(10, undefined, () => 0.5)).toBe(15000);
    expect(retryDelay(1, 5000)).toBe(5000);
    expect(retryDelay(1, 999_000)).toBe(30000);
    expect(parseRetryAfter("7")).toBe(7000);
    expect(parseRetryAfter("Wed, 21 Oct 2015 07:28:10 GMT", Date.parse("Wed, 21 Oct 2015 07:28:00 GMT"))).toBe(10000);
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});

describe("retrying requests", () => {
  it("retries timeouts, overload and rate limits until one works", async () => {
    const calls = stubFetch(busy(504), busy(429), busy(503), json("Hello"));
    expect(await completeChat({ messages: [], temperature: 1, maxTokens: 10, connection })).toBe("Hello");
    expect(calls).toHaveBeenCalledTimes(4);
  });

  it("does not retry what another try can't fix", async () => {
    const calls = stubFetch(new Response("bad key", { status: 401 }), json("never"));
    await expect(completeChat({ messages: [], temperature: 1, maxTokens: 10, connection })).rejects.toThrow(/API key was refused/);
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("gives up at the deadline and says how often it tried", async () => {
    stubFetch(busy(503), busy(503), busy(503), busy(503));
    await expect(
      completeChat({ messages: [], temperature: 1, maxTokens: 10, connection, deadline: Date.now() + 1000 }),
    ).rejects.toThrow(/Tried 1 time, then gave up/);
  });

  it("tries once only when asked (the connection test)", async () => {
    const calls = stubFetch(new TypeError("fetch failed"), json("never"));
    await expect(completeChat({ messages: [], temperature: 1, maxTokens: 10, connection, retry: false })).rejects.toThrow(/connection to the provider broke/);
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("retries a stream that breaks before any text, and an empty one once", async () => {
    const broken = new Response(
      new ReadableStream({
        start(c) {
          c.error(new TypeError("terminated"));
        },
      }),
      { status: 200 },
    );
    const empty = new Response("data: [DONE]\n\n", { status: 200 });
    const calls = stubFetch(busy(502), broken, empty, sse("Hi there"));
    let text = "";
    for await (const d of streamChat({ messages: [], temperature: 1, maxTokens: 10, connection })) text += d;
    expect(text).toBe("Hi there");
    expect(calls).toHaveBeenCalledTimes(4);
  }, 10_000);
});

describe("stalled streams", () => {
  it("gives up on a stream that goes quiet", async () => {
    const quiet = new ReadableStream<Uint8Array>({ start() {} });
    const read = async () => {
      for await (const _ of readSseDeltas(quiet, undefined, 50)) void _;
    };
    await expect(read()).rejects.toBeInstanceOf(RetryableError);
  });
});
