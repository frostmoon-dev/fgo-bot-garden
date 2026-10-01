import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const main = { baseUrl: "https://main.test/v1", apiKey: "k1", model: "main-model" };
const backup = { baseUrl: "https://backup.test/v1", apiKey: "k2", model: "backup-model" };
// The setting sends scene box requests to the backup; everything else stays on the main model.
vi.mock("../connection", () => ({
  activeConnection: vi.fn(async () => main),
  backupConnection: vi.fn(async () => null),
  helperConnection: vi.fn(async (purpose?: string) => (purpose === "scene" ? backup : null)),
}));

const { completeChat } = await import("../client");

afterEach(() => vi.unstubAllGlobals());

const ok = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

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

describe("background jobs on the backup model", () => {
  it("sends a routed job to the backup only", async () => {
    const urls = stub((url) => ok(url.startsWith(backup.baseUrl) ? "from backup" : "from main"));
    expect(await completeChat({ messages: [], temperature: 1, maxTokens: 10, purpose: "scene" })).toBe("from backup");
    expect(urls).toEqual([`${backup.baseUrl}/chat/completions`]);
  });

  it("keeps other requests on the main model", async () => {
    const urls = stub(() => ok("from main"));
    expect(await completeChat({ messages: [], temperature: 1, maxTokens: 10, purpose: "write" })).toBe("from main");
    expect(urls).toEqual([`${main.baseUrl}/chat/completions`]);
  });

  it("lets the main model do the job when the backup fails it", async () => {
    stub((url) => (url.startsWith(backup.baseUrl) ? new Response("bad key", { status: 401 }) : ok("from main")));
    expect(await completeChat({ messages: [], temperature: 1, maxTokens: 10, purpose: "scene" })).toBe("from main");
  });
});
