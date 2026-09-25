import type { ChatMessage } from "@/lib/llm/types";
import type { Mode } from "@/lib/parser/types";
import { applyMacros, type Macros } from "@/lib/stage/beats";
import { MODE_RULES, SYSTEM_RULES } from "./rules";
import { estimateTokens } from "./tokens";

export interface PromptCharacter {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  personality: string;
  speechStyle: string;
  lore: string;
  relationship: string;
  scenario: string;
  exampleDialogues: string;
  expressions: { key: string; label: string; description: string }[];
}

export interface PromptInput {
  mode: Mode;
  mainCharacterId: string;
  cast: PromptCharacter[];
  backgrounds: { key: string; label: string; description: string }[];
  persona: { name: string; description: string; addressAs: string };
  lore: { title: string; content: string }[];
  summary: string;
  history: ChatMessage[];
  continueScene: boolean;
}

export interface BuiltPrompt {
  messages: ChatMessage[];
  tokens: number;
}

function field(label: string, value: string): string | null {
  return value.trim() ? `${label}: ${value.trim()}` : null;
}

function characterBlock(c: PromptCharacter, isMain: boolean): string {
  const expressions = c.expressions
    .map((e) => `- ${e.key}${e.description ? ` — ${e.description}` : e.label ? ` — ${e.label}` : ""}`)
    .join("\n");
  return [
    `## ${c.name}${isMain ? " (main character)" : ""}`,
    `Tag name: ${c.name}${c.aliases.length ? ` (also accepted: ${c.aliases.join(", ")})` : ""}`,
    field("Description", c.description),
    field("Personality", c.personality),
    field("Speech style", c.speechStyle),
    field("Background", c.lore),
    field("Relationship with {{user}}", c.relationship),
    `Expressions (id — when to use):\n${expressions}`,
    c.exampleDialogues.trim() ? `Example dialogue:\n${c.exampleDialogues.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPrompt(input: PromptInput): BuiltPrompt {
  const main = input.cast.find((c) => c.id === input.mainCharacterId) ?? input.cast[0];
  const cast = input.mode === "dialogue" ? [main] : input.cast;
  const macros: Macros = { user: input.persona.name, char: main?.name ?? "" };

  const sections: string[] = [SYSTEM_RULES, MODE_RULES[input.mode]];

  sections.push(`# CHARACTERS\n${cast.map((c) => characterBlock(c, c.id === main?.id)).join("\n\n")}`);
  if (main?.scenario.trim()) sections.push(`# SCENARIO\n${main.scenario.trim()}`);

  if (input.mode === "narrative" && input.backgrounds.length) {
    const list = input.backgrounds
      .map((b) => `- ${b.key}${b.description || b.label ? ` — ${b.description || b.label}` : ""}`)
      .join("\n");
    sections.push(`# BACKGROUNDS (for {scene:…})\n${list}`);
  }

  const persona = [
    `# {{user}} — the user's character. You never write for them.`,
    `Name: ${input.persona.name}`,
    field("Characters address them as", input.persona.addressAs),
    field("About them", input.persona.description),
  ]
    .filter(Boolean)
    .join("\n");
  sections.push(persona);

  if (input.lore.length) {
    sections.push(`# WORLD INFO\n${input.lore.map((l) => (l.title ? `- ${l.title}: ${l.content}` : `- ${l.content}`)).join("\n")}`);
  }
  if (input.summary.trim()) sections.push(`# STORY SO FAR\n${input.summary.trim()}`);

  const system = applyMacros(sections.join("\n\n"), macros);
  const history = input.history.map((m) => ({ ...m, content: applyMacros(m.content, macros) }));

  const last = history[history.length - 1];
  if (input.continueScene || !last || last.role !== "user") {
    history.push({ role: "user", content: `[Continue the scene. Remember: do not write for ${macros.user}.]` });
  }

  const messages: ChatMessage[] = [{ role: "system", content: system }, ...history];
  const tokens = messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
  return { messages, tokens };
}
