import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { motionFor, resolveMotion } from "../motion";
import { checkBaseUrl, providerFor } from "../llm/providers";
import { decryptSecret, encryptSecret, keyHint } from "../llm/secret";

describe("motion", () => {
  it("moves by feeling when expressive", () => {
    expect(motionFor("expressive", "surprised")).toBe("hop");
    expect(motionFor("expressive", "laugh")).toBe("bounce");
    expect(motionFor("expressive", "angry")).toBe("shake");
    expect(motionFor("expressive", "crying")).toBe("sink");
    expect(motionFor("expressive", "smug")).toBe("lean");
    expect(motionFor("expressive", "neutral")).toBe("nod");
  });

  it("keeps calm characters calm and still ones still", () => {
    expect(motionFor("calm", "surprised")).toBe("nod");
    expect(motionFor("calm", "sad")).toBe("sink");
    expect(motionFor("still", "furious")).toBeNull();
    expect(motionFor("bouncy", "neutral")).toBe("hop");
    expect(motionFor("bouncy", "angry")).toBe("shake");
  });

  it("lets an ascension override the profile", () => {
    expect(resolveMotion("bouncy", "calm")).toBe("calm");
    expect(resolveMotion("bouncy", "")).toBe("bouncy");
    expect(resolveMotion("unknown", null)).toBe("expressive");
  });
});

describe("connection", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts https, and plain http only on this machine or network", () => {
    expect(checkBaseUrl("https://api.deepseek.com/v1")).toBeNull();
    expect(checkBaseUrl("http://localhost:11434/v1")).toBeNull();
    expect(checkBaseUrl("http://192.168.1.20:1234/v1")).toBeNull();
    expect(checkBaseUrl("http://example.com/v1")).toMatch(/https/);
    expect(checkBaseUrl("api.deepseek.com")).toMatch(/https/);
  });

  it("recognises a preset from its address", () => {
    expect(providerFor("https://openrouter.ai/api/v1/")).toBe("openrouter");
    expect(providerFor("https://my-proxy.example/v1")).toBe("custom");
  });

  it("encrypts keys, and can't read them with another secret", () => {
    vi.stubEnv("AUTH_SECRET", "a".repeat(40));
    const stored = encryptSecret("sk-test-1234567890");
    expect(stored).not.toContain("sk-test");
    expect(decryptSecret(stored)).toBe("sk-test-1234567890");
    expect(keyHint("sk-test-1234567890")).toBe("…7890");
    vi.stubEnv("AUTH_SECRET", "b".repeat(40));
    expect(decryptSecret(stored)).toBeNull();
  });
});
