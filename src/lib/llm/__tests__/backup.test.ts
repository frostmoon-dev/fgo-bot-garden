import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const main = { baseUrl: "https://main.test/v1", apiKey: "k1", model: "main-model" };
const backup = { baseUrl: "https://backup.test/v1", apiKey: "k2", model: "backup-model" };
vi.mock("../connection", () => ({ activeConnection: vi.fn(async () => main), backupConnection: vi.fn(async () => backup) }));

const { completeChat, streamChat } = await import("../client");

afterEach(() => vi.unstubAllGlobals());

function stub(handler: (url: string) => Response) {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      return handler(url);
    }),
  );
  return urls;
}

describe("backup model", () => {
  it("answers when the main model fails, and says so", async () => {
    const urls = stub((url) =>
      url.startsWith(main.baseUrl)
        ? new Response("no credits", { status: 402 })
        : new Response(JSON.stringify({ choices: [{ message: { content: "From backup" } }] }), { status: 200 }),
    );
    const onFallback = vi.fn();
    expect(await completeChat({ messages: [], temperature: 1, maxTokens: 10, onFallback })).toBe("From backup");
    expect(urls).toEqual([`${main.baseUrl}/chat/completions`, `${backup.baseUrl}/chat/completions`]);
    expect(onFallback).toHaveBeenCalledWith(expect.stringMatching(/out of credits/));
  });

  it("streams from the backup when the main stream fails before any text", async () => {
    stub((url) =>
      url.startsWith(main.baseUrl)
        ? new Response("bad model", { status: 404 })
        : new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: "Hello" } }] })}\n\ndata: [DONE]\n\n`, { status: 200 }),
    );
    let text = "";
    for await (const d of streamChat({ messages: [], temperature: 1, maxTokens: 10 })) text += d;
    expect(text).toBe("Hello");
  });

  it("is not used when the main model works", async () => {
    const urls = stub(() => new Response(JSON.stringify({ choices: [{ message: { content: "Main" } }] }), { status: 200 }));
    expect(await completeChat({ messages: [], temperature: 1, maxTokens: 10 })).toBe("Main");
    expect(urls).toHaveLength(1);
  });
  it("names both problems when the backup fails too", async () => {
    stub((url) => (url.startsWith(main.baseUrl) ? new Response("no credits", { status: 402 }) : new Response("bad key", { status: 401 })));
    await expect(completeChat({ messages: [], temperature: 1, maxTokens: 10 })).rejects.toThrow(
      /main model failed: .*out of credits.*backup model failed too: .*API key was refused/,
    );
    const read = async () => {
      for await (const d of streamChat({ messages: [], temperature: 1, maxTokens: 10 })) void d;
    };
    await expect(read()).rejects.toThrow(/main model failed: .*backup model failed too/);
  });
});
