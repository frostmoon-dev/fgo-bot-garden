import type { ChatMessage } from "@/lib/llm/types";
import { mentions, presentIds } from "@/lib/story/formerCast";
import type { Mode } from "@/lib/parser/types";
import { applyMacros, type Macros } from "@/lib/stage/beats";
import {
  formatExample,
  formatReminder,
  lengthRule,
  MODE_RULES,
  pronounsOf,
  STRICT_RULES,
  SYSTEM_RULES,
  userReminder,
  type ReplyLength,
} from "./rules";

export type { ReplyLength } from "./rules";
import { estimateTokens } from "./tokens";

// balanced: the full prompt. strict: extra format guardrails for models that break the script format.
// compact: fewer tokens for small context windows, with the strict guardrails (small models need them).
export type PromptProfile = "balanced" | "compact" | "strict";
// auto drops example dialogue once the story has replies of its own (JanitorAI's "temporary tokens").
export type ExampleMode = "auto" | "always" | "never";
// end: world info and the format reminder go right before the latest message. The long prefix
// (rules, characters, history) then stays identical between turns, so provider prompt caching hits.
// top: everything in the first system message, for APIs that reject system messages mid-chat.
export type MemoryPlacement = "end" | "top";

export interface PromptOptions {
  profile: PromptProfile;
  exampleMode: ExampleMode;
  memoryPlacement: MemoryPlacement;
  formatReminder: boolean;
  customPrompt: string;
  replyLength: ReplyLength;
  // Tokens the model accepts in total, and how many of them are kept free for the reply.
  contextSize: number;
  replyTokens: number;
}

export const DEFAULT_PROMPT_OPTIONS: PromptOptions = {
  profile: "balanced",
  exampleMode: "auto",
  memoryPlacement: "end",
  formatReminder: true,
  customPrompt: "",
  replyLength: "scene",
  contextSize: 16384,
  replyTokens: 900,
};

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
  // Only the expressions the character's current ascension has a face for.
  expressions: { key: string; label: string; description: string }[];
  // Bond level with the user, already written out (see lib/bond.ts).
  bond?: string;
  // What they remember about the user from all their stories together (lib/memory).
  memories?: string;
  // The ascension in use and the character's other ones, when there are several.
  form?: string;
  otherForms?: string[];
}

export interface PromptHistoryItem extends ChatMessage {
  pinned?: boolean;
}

export interface PromptInput {
  mode: Mode;
  mainCharacterId: string;
  cast: PromptCharacter[];
  backgrounds: { key: string; label: string; description: string }[];
  persona: { name: string; description: string; addressAs: string; role?: string };
  lore: { title: string; content: string }[];
  summary: string;
  // The user's own notes for this story. Always sent.
  memory?: string;
  // Pinned messages that are no longer part of the history.
  pinned?: string[];
  // The scene box: where, when, who is present. Changes every turn, so it goes near the end.
  scene?: string;
  // Things that just happened outside the text, such as a form change. Sent with this reply only.
  events?: string[];
  // Characters with lines in the history who were taken out of the cast.
  absent?: string[];
  history: PromptHistoryItem[];
  continueScene: boolean;
  // The user's direction for this reply only, from outside the story (see the chat route).
  direction?: string;
  options?: Partial<PromptOptions>;
}

export interface PromptBreakdown {
  system: number;
  memory: number;
  history: number;
  notes: number;
  dropped: number;
}

export interface BuiltPrompt {
  messages: ChatMessage[];
  tokens: number;
  breakdown: PromptBreakdown;
}

// Example dialogue is sent until the story has this many replies to imitate instead.
const EXAMPLE_REPLIES = 3;
// Per-message overhead of the chat format, and a safety margin for the rough token estimate.
const MESSAGE_TOKENS = 4;
const MARGIN_TOKENS = 64;

function field(label: string, value: string): string | null {
  return value.trim() ? `${label}: ${value.trim()}` : null;
}

function characterBlock(
  c: PromptCharacter,
  isMain: boolean,
  opts: { brief: boolean; examples: boolean; hints: boolean },
): string {
  const expressions = c.expressions
    .map((e) => {
      const hint = e.description || e.label;
      return opts.hints && hint ? `${e.key} (${hint})` : e.key;
    })
    .join("; ");
  return [
    `## ${c.name}${isMain ? " (main character)" : ""}`,
    `Tag name: ${c.name}${c.aliases.length ? ` (also accepted: ${c.aliases.join(", ")})` : ""}`,
    c.form
      ? `Current form: ${c.form}${c.otherForms?.length ? ` (other forms: ${c.otherForms.join(", ")})` : ""}. Everything below describes this form.`
      : null,
    field("Description", c.description),
    opts.brief ? null : field("Personality", c.personality),
    field("Speech style", c.speechStyle),
    opts.brief ? null : field("Background", c.lore),
    opts.brief ? null : field("Relationship with {{user}}", c.relationship),
    `Expressions: ${expressions}`,
    opts.examples && c.exampleDialogues.trim() ? `Example dialogue:\n${c.exampleDialogues.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function tokensOf(messages: ChatMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + MESSAGE_TOKENS, 0);
}

function join(parts: (string | null | false | undefined)[]): string {
  return parts.filter(Boolean).join("\n\n");
}

// Who is here and who the user just spoke to. Weaker models otherwise let the main character do all the
// talking, even answer for the others ("She doesn't seem to have an answer"), while the rest stand silent.
function stageNote(input: PromptInput, cast: PromptCharacter[]): string | null {
  if (cast.length < 2) return null;
  const lastUser = input.history.findLast((m) => m.role === "user")?.content ?? "";
  const named = (c: PromptCharacter) => mentions(lastUser, [c.name, ...c.aliases]);
  const listed = input.scene ? presentIds(input.scene, cast) : null;
  const present = listed ? cast.filter((c) => listed.has(c.id) || named(c)) : [];
  const addressed = cast.filter(named);
  if (present.length < 2 && !addressed.length) return null;
  const names = (list: PromptCharacter[]) => list.map((c) => c.name).join(", ");
  return [
    "# WHO SPEAKS",
    present.length >= 2 &&
      `Here now: ${names(present)}. Each of them speaks and acts for themselves, in their own [Name|expression] lines, and reacts to the others. Nobody answers, explains or narrates silence for someone who is here: let that character talk.`,
    addressed.length > 0 &&
      `{{user}} just spoke to ${names(addressed)}. ${addressed.length > 1 ? "They answer" : `${addressed[0].name} answers`} first, in their own words, before anyone else reacts. If they are not on stage yet, write {enter:Name:position} first.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPrompt(input: PromptInput): BuiltPrompt {
  const o = { ...DEFAULT_PROMPT_OPTIONS, ...input.options };
  const compact = o.profile === "compact";
  const main = input.cast.find((c) => c.id === input.mainCharacterId) ?? input.cast[0];
  const cast = input.mode === "dialogue" ? [main] : input.cast;
  const macros: Macros = { user: input.persona.name, char: main?.name ?? "" };
  const assistantTurns = input.history.filter((m) => m.role === "assistant").length;
  const examples = o.exampleMode === "always" || (o.exampleMode === "auto" && assistantTurns < EXAMPLE_REPLIES);

  // Stable part: only changes when the user edits a character or a setting.
  const backgrounds =
    input.mode === "narrative" && input.backgrounds.length
      ? compact
        ? `# BACKGROUNDS (for {scene:…})\n${input.backgrounds.map((b) => b.key).join(", ")}`
        : `# BACKGROUNDS (for {scene:…})\n${input.backgrounds
            .map((b) => `- ${b.key}${b.description || b.label ? ` — ${b.description || b.label}` : ""}`)
            .join("\n")}`
      : null;
  const persona = [
    `# {{user}} — the user's character. You never write for them. Keep every detail below consistent, including their pronouns.`,
    `Name: ${input.persona.name}`,
    field("Pronouns", pronounsOf(input.persona.description) ?? ""),
    input.persona.role?.trim() &&
      `Role in the story: ${input.persona.role.trim()}\nThis is who {{user}} is here, even where a character's canon or definition assumes someone else (for example their Master). Every character knows {{user}} in this role and treats them accordingly.`,
    field("Characters address them as", input.persona.addressAs),
    field("About them", input.persona.description),
  ]
    .filter(Boolean)
    .join("\n");
  const staticPrompt = join([
    SYSTEM_RULES,
    o.profile !== "balanced" && STRICT_RULES,
    MODE_RULES[input.mode],
    lengthRule(input.mode, o.replyLength),
    main && formatExample(input.mode, main.name, main.expressions.map((e) => e.key)),
    `# CHARACTERS\n${cast
      .map((c) => characterBlock(c, c.id === main?.id, { brief: compact && c.id !== main?.id, examples, hints: !compact }))
      .join("\n\n")}`,
    main?.scenario.trim() && `# SCENARIO\n${main.scenario.trim()}`,
    backgrounds,
    persona,
    o.customPrompt.trim() && `# EXTRA INSTRUCTIONS\n${o.customPrompt.trim()}`,
  ]);

  // Bond and what each character remembers of the user. They change every few replies, so they sit here,
  // after the character cards: the rules and cards before them stay the same from turn to turn, which is the
  // part providers can reuse from their prompt cache (OpenAI, DeepSeek, Gemini, local servers alike).
  const bonds = cast
    .map((c) => {
      const lines = [
        c.bond && `Bond with {{user}}: ${c.bond}`,
        c.memories?.trim() &&
          `What ${c.name} remembers about {{user}} from all their time together (true; bring it up naturally when it fits):\n${c.memories.trim()}`,
      ].filter(Boolean);
      return lines.length ? `## ${c.name}\n${lines.join("\n")}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  // Changes only when the user edits it, old messages are folded into the summary, or a bond or memory grows.
  const memoryText = (pinned: string[]) =>
    join([
      bonds && `# BONDS AND MEMORIES OF {{user}}\n${bonds}`,
      input.memory?.trim() && `# STORY MEMORY (the user's notes, always true)\n${input.memory.trim()}`,
      input.summary.trim() && `# STORY SO FAR\n${input.summary.trim()}`,
      pinned.length > 0 && `# PINNED MOMENTS (keep these in mind)\n${pinned.join("\n---\n")}`,
    ]);

  // Changes often, so it goes last.
  const notes = join([
    input.scene?.trim() && `# CURRENT SCENE\n${input.scene.trim()}`,
    input.mode === "narrative" && stageNote(input, cast),
    !!input.events?.length && `# JUST HAPPENED\n${input.events.map((e) => `- ${e}`).join("\n")}`,
    !!input.absent?.length &&
      `# NO LONGER IN THIS STORY\n${input.absent.join(", ")}: out of the story from now on. They do not appear, speak or act, and nobody treats them as present; their earlier lines are only history. If it matters, they have gone elsewhere.`,
    input.lore.length > 0 &&
      `# WORLD INFO\n${input.lore.map((l) => (l.title ? `- ${l.title}: ${l.content}` : `- ${l.content}`)).join("\n")}`,
    userReminder(input.persona),
    input.direction?.trim() &&
      `# DIRECTION FOR THIS REPLY (from the user, outside the story)\n${input.direction.trim()}\nFollow it in this reply. It is not something anyone in the story said or did: never quote it or mention it, and still never write {{user}}'s words or actions.`,
    (o.formatReminder || o.profile !== "balanced") && formatReminder(input.mode, o.replyLength),
  ]);

  const history: PromptHistoryItem[] = input.history.map((m) => ({ ...m, content: applyMacros(m.content, macros) }));
  const last = history.at(-1);
  if (input.continueScene || !last || last.role !== "user") {
    history.push({ role: "user", content: `[Continue the scene. Remember: do not write for ${macros.user}.]` });
  }

  // Drop the oldest messages until everything fits. The latest message always stays.
  // A dropped pin moves into the memory section, so pins are paid for up front either way.
  const cost = (m: PromptHistoryItem) => estimateTokens(m.content) + MESSAGE_TOKENS;
  const fixed =
    estimateTokens(staticPrompt) + estimateTokens(memoryText(input.pinned ?? [])) + estimateTokens(notes) + 2 * MESSAGE_TOKENS;
  let keepFrom = history.length - 1;
  let room =
    o.contextSize -
    o.replyTokens -
    fixed -
    MARGIN_TOKENS -
    cost(history[keepFrom]) -
    history.slice(0, keepFrom).reduce((sum, m) => sum + (m.pinned ? cost(m) : 0), 0);
  while (keepFrom > 0) {
    const next = history[keepFrom - 1];
    const price = next.pinned ? 0 : cost(next);
    if (price > room) break;
    room -= price;
    keepFrom--;
  }
  const dropped = history.slice(0, keepFrom);
  const kept = history.slice(keepFrom);
  const pinned = [...(input.pinned ?? []), ...dropped.filter((m) => m.pinned).map((m) => m.content)].map((p) =>
    applyMacros(p, macros),
  );

  const memory = applyMacros(memoryText(pinned), macros);
  const notesText = applyMacros(notes, macros);
  const system = applyMacros(staticPrompt, macros);
  const top = o.memoryPlacement === "top";

  const chat: ChatMessage[] = kept.map(({ role, content }) => ({ role, content }));
  if (!top && notesText) chat.splice(chat.length - 1, 0, { role: "system", content: notesText });
  const messages: ChatMessage[] = [{ role: "system", content: join([system, memory, top && notesText]) }, ...chat];

  const breakdown: PromptBreakdown = {
    system: estimateTokens(system),
    memory: estimateTokens(memory),
    history: tokensOf(kept),
    notes: estimateTokens(notesText),
    dropped: dropped.length,
  };
  return { messages, tokens: tokensOf(messages), breakdown };
}
