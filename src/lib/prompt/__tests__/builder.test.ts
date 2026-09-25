import { describe, expect, it } from "vitest";
import { buildPrompt, type PromptInput } from "../builder";

const character = (id: string, name: string) => ({
  id,
  name,
  aliases: [],
  description: `${name} desc`,
  personality: "",
  speechStyle: "",
  lore: "",
  relationship: "Knows {{user}}",
  scenario: id === "bb" ? "Moon Cell, {{char}} waits." : "",
  exampleDialogues: "",
  expressions: [{ key: "neutral", label: "Neutral", description: "calm" }],
});

const base: PromptInput = {
  mode: "narrative",
  mainCharacterId: "bb",
  cast: [character("bb", "BB"), character("ob", "Oberon")],
  backgrounds: [{ key: "moon", label: "Moon", description: "the moon cell" }],
  persona: { name: "Ritsuka", description: "A Master", addressAs: "Senpai" },
  lore: [{ title: "Chaldea", content: "An org." }],
  summary: "They met.",
  history: [{ role: "user", content: "Hi" }],
  continueScene: false,
};

describe("buildPrompt", () => {
  it("orders sections and replaces macros", () => {
    const { messages } = buildPrompt(base);
    const sys = messages[0].content;
    const order = ["OUTPUT FORMAT", "MODE: NARRATIVE", "# CHARACTERS", "# SCENARIO", "# BACKGROUNDS", "the user's character", "# WORLD INFO", "# STORY SO FAR"];
    const idx = order.map((s) => sys.indexOf(s));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(sys).toContain("Knows Ritsuka");
    expect(sys).toContain("Moon Cell, BB waits.");
    expect(sys).not.toContain("{{user}}");
    expect(messages.at(-1)).toEqual({ role: "user", content: "Hi" });
  });

  it("uses only the main character and no backgrounds in dialogue mode", () => {
    const sys = buildPrompt({ ...base, mode: "dialogue" }).messages[0].content;
    expect(sys).toContain("MODE: DIALOGUE");
    expect(sys).not.toContain("## Oberon");
    expect(sys).not.toContain("# BACKGROUNDS");
  });

  it("adds a continue note when the last message is not the user's", () => {
    const { messages } = buildPrompt({ ...base, history: [{ role: "assistant", content: "[BB] Hi" }] });
    expect(messages.at(-1)?.role).toBe("user");
    expect(messages.at(-1)?.content).toMatch(/Continue the scene/);
  });
});
