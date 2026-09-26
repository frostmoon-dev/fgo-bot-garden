import { describe, expect, it } from "vitest";
import { buildPrompt, type PromptInput } from "../builder";

const character = (id: string, name: string) => ({
  id,
  name,
  aliases: [],
  description: `${name} desc`,
  personality: `${name} personality`,
  speechStyle: "",
  lore: "",
  relationship: "Knows {{user}}",
  scenario: id === "bb" ? "Moon Cell, {{char}} waits." : "",
  exampleDialogues: `[${name}|neutral] Example line.`,
  expressions: [
    { key: "neutral", label: "Neutral", description: "calm" },
    { key: "smirk", label: "Smirk", description: "teasing" },
  ],
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

const turns = (n: number) =>
  Array.from({ length: n }, (_, i) => [
    { role: "user" as const, content: `Question ${i}` },
    { role: "assistant" as const, content: `[BB|neutral] Answer ${i}` },
  ]).flat();

describe("buildPrompt", () => {
  it("orders the stable sections, then memory, and replaces macros", () => {
    const { messages } = buildPrompt(base);
    const sys = messages[0].content;
    const order = ["OUTPUT FORMAT", "MODE: NARRATIVE", "EXAMPLE OF THE FORMAT", "# CHARACTERS", "# SCENARIO", "# BACKGROUNDS", "the user's character", "# STORY SO FAR"];
    const idx = order.map((s) => sys.indexOf(s));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(sys).toContain("Knows Ritsuka");
    expect(sys).toContain("Moon Cell, BB waits.");
    expect(sys).toContain("[BB|smirk] There you are.");
    expect(sys).not.toContain("{{user}}");
    expect(messages.at(-1)).toEqual({ role: "user", content: "Hi" });
  });

  it("sends the user's role over the characters' canon, and what each character remembers", () => {
    const { messages } = buildPrompt({
      ...base,
      persona: { ...base.persona, role: "A Chaldea staff member, not a Master" },
      cast: [{ ...character("bb", "BB"), memories: "- Ritsuka hates coffee" }, character("ob", "Oberon")],
    });
    const sys = messages[0].content;
    expect(sys).toContain("Role in the story: A Chaldea staff member, not a Master");
    expect(sys).toContain("even where a character's canon or definition assumes someone else");
    expect(sys).toContain("What BB remembers about Ritsuka");
    expect(sys).toContain("- Ritsuka hates coffee");
    expect(sys).not.toContain("What Oberon remembers");
  });

  it("puts world info and the format reminder right before the latest message", () => {
    const { messages } = buildPrompt(base);
    expect(messages[0].content).not.toContain("# WORLD INFO");
    const note = messages.at(-2)!;
    expect(note.role).toBe("system");
    expect(note.content).toContain("# WORLD INFO");
    expect(note.content).toContain("REMINDER");
    expect(note.content).not.toContain("{{user}}");
  });

  it("keeps the prefix identical when only the lore changes", () => {
    const history = [...turns(2), { role: "user" as const, content: "Next" }];
    const a = buildPrompt({ ...base, history, lore: [] }).messages;
    const b = buildPrompt({ ...base, history, lore: [{ title: "Moon", content: "Big." }] }).messages;
    expect(b.slice(0, -2)).toEqual(a.slice(0, -2));
  });

  it("puts everything in the system prompt with top placement", () => {
    const { messages } = buildPrompt({ ...base, options: { memoryPlacement: "top" } });
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain("# WORLD INFO");
    expect(messages[0].content).toContain("REMINDER");
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

  it("enforces stricter VN formatting for weak models", () => {
    const sys = buildPrompt({ ...base, options: { profile: "strict", formatReminder: false } }).messages;
    expect(sys[0].content).toContain("Never mix narration and dialogue on the same line");
    expect(sys[0].content).toContain("If a line would mix styles, split it into separate lines");
    expect(sys.at(-2)?.content).toContain("REMINDER");
  });

  it("keeps side characters short in compact mode", () => {
    const sys = buildPrompt({ ...base, options: { profile: "compact" } }).messages[0].content;
    expect(sys).toContain("## Oberon");
    expect(sys).not.toContain("Oberon personality");
    expect(sys).toContain("BB personality");
    expect(sys).toContain("Expressions: neutral; smirk");
    expect(sys).toContain("moon\n");
    expect(sys).not.toContain("the moon cell");
  });

  it("drops example dialogue once the story has replies of its own", () => {
    expect(buildPrompt({ ...base, history: turns(1) }).messages[0].content).toContain("Example dialogue:");
    expect(buildPrompt({ ...base, history: turns(3) }).messages[0].content).not.toContain("Example dialogue:");
    expect(buildPrompt({ ...base, history: turns(3), options: { exampleMode: "always" } }).messages[0].content).toContain("Example dialogue:");
    expect(buildPrompt({ ...base, options: { exampleMode: "never" } }).messages[0].content).not.toContain("Example dialogue:");
  });

  it("includes the story memory and pinned moments", () => {
    const sys = buildPrompt({ ...base, memory: "{{user}} owes BB a favor.", pinned: ["[BB|smirk] Promise me."] }).messages[0].content;
    expect(sys).toContain("# STORY MEMORY");
    expect(sys).toContain("Ritsuka owes BB a favor.");
    expect(sys).toContain("# PINNED MOMENTS");
    expect(sys).toContain("Promise me.");
  });

  it("drops the oldest messages to fit the context and keeps dropped pins", () => {
    const history = [
      { role: "user" as const, content: "Remember this. ".repeat(40), pinned: true },
      ...turns(20).map((m) => ({ ...m, content: `${m.content} ${"filler ".repeat(40)}` })),
      { role: "user" as const, content: "Latest" },
    ];
    const small = buildPrompt({ ...base, history, options: { contextSize: 3000, replyTokens: 500 } });
    expect(small.tokens).toBeLessThanOrEqual(3000 - 500);
    expect(small.breakdown.dropped).toBeGreaterThan(0);
    expect(small.messages.at(-1)).toEqual({ role: "user", content: "Latest" });
    expect(small.messages[0].content).toContain("# PINNED MOMENTS");
    const large = buildPrompt({ ...base, history, options: { contextSize: 100000 } });
    expect(large.breakdown.dropped).toBe(0);
  });
});
