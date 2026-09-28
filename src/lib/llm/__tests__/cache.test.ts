import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../connection", () => ({ activeConnection: vi.fn() }));

const { completeChat, wireMessages } = await import("../client");

afterEach(() => vi.unstubAllGlobals());

async function sentBody(connection: { baseUrl: string; apiKey: string; model: string }) {
  let body: Record<string, unknown> = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
    }),
  );
  await completeChat({
    messages: [
      { role: "system", content: "RULES\n\nMEMORY", cacheAt: [5, 13] },
      { role: "user", content: "Hi", cacheAt: [2] },
      { role: "user", content: "Now" },
    ],
    temperature: 1,
    maxTokens: 10,
    connection,
    cacheKey: "bond-garden:s1",
  });
  return body;
}

describe("prompt caching", () => {
  it("splits marked messages into cached text parts", () => {
    const [system, user] = wireMessages(
      [
        { role: "system", content: "RULES\n\nMEMORY\n\nNOTES", cacheAt: [5, 13] },
        { role: "user", content: "Hi", cacheAt: [2] },
      ],
      true,
    );
    expect(system.content).toEqual([
      { type: "text", text: "RULES", cache_control: { type: "ephemeral" } },
      { type: "text", text: "\n\nMEMORY", cache_control: { type: "ephemeral" } },
      { type: "text", text: "\n\nNOTES" },
    ]);
    expect(user.content).toEqual([{ type: "text", text: "Hi", cache_control: { type: "ephemeral" } }]);
  });

  it("marks Claude, Gemini and Qwen on OpenRouter", async () => {
    const body = await sentBody({ baseUrl: "https://openrouter.ai/api/v1", apiKey: "k", model: "anthropic/claude-sonnet-4.5" });
    const messages = body.messages as { content: unknown }[];
    expect(Array.isArray(messages[0].content)).toBe(true);
    expect(messages[2].content).toBe("Now");
    expect(body.prompt_cache_key).toBeUndefined();
  });

  it("sends plain messages everywhere else, and never the marks themselves", async () => {
    const body = await sentBody({ baseUrl: "https://api.deepseek.com/v1", apiKey: "k", model: "deepseek-chat" });
    expect(body.messages).toEqual([
      { role: "system", content: "RULES\n\nMEMORY" },
      { role: "user", content: "Hi" },
      { role: "user", content: "Now" },
    ]);
    expect(body.prompt_cache_key).toBeUndefined();
  });

  it("gives OpenAI a cache key per story", async () => {
    const body = await sentBody({ baseUrl: "https://api.openai.com/v1", apiKey: "k", model: "gpt-5.6" });
    expect(body.prompt_cache_key).toBe("bond-garden:s1");
    expect(typeof (body.messages as { content: unknown }[])[0].content).toBe("string");
  });
});
