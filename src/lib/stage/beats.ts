import { ScriptParser, type Effect, type ParserContext, type ScriptLine } from "@/lib/parser";
import { splitUserText } from "@/lib/userInput";
import { POSITIONS } from "@/lib/parser/types";
import { applyLine, type StageOptions, type StageState } from "./stage";

export interface Beat {
  key: string;
  messageId: string;
  role: "assistant" | "user";
  // "user" is the user's own spoken line. The user's *actions* are narration with role "user".
  kind: "dialogue" | "narration" | "user";
  speakerId: string | null;
  speakerName: string | null;
  text: string;
  stage: StageState;
  // A screen effect that plays when this beat starts.
  effect?: Effect;
}

export interface BeatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

export interface Macros {
  user: string;
  char: string;
}

export function applyMacros(text: string, macros: Macros): string {
  return text.replace(/\{\{\s*user\s*\}\}/gi, macros.user).replace(/\{\{\s*char\s*\}\}/gi, macros.char);
}

// Turns one assistant message into beats, line by line. Used while streaming and for history.
export class BeatBuilder {
  private parser: ScriptParser;
  private count = 0;
  private pendingEffect: Effect | undefined;
  stage: StageState;

  constructor(
    private readonly messageId: string,
    parserCtx: ParserContext,
    private readonly stageOpts: StageOptions,
    startStage: StageState,
    private readonly macros: Macros,
  ) {
    this.parser = new ScriptParser(parserCtx);
    this.stage = startStage;
  }

  pushLine(raw: string): Beat[] {
    const out: Beat[] = [];
    for (const line of this.parser.parseLine(raw)) {
      this.stage = applyLine(this.stage, line, this.stageOpts);
      if (line.type === "effect") {
        this.pendingEffect = line.effect;
        continue;
      }
      const beat = this.toBeat(line);
      if (beat) out.push(beat);
    }
    return out;
  }

  pushText(text: string): Beat[] {
    return text.split(/\r?\n/).flatMap((l) => this.pushLine(l));
  }

  private toBeat(line: ScriptLine): Beat | null {
    if (line.type !== "dialogue" && line.type !== "narration") return null;
    if (!line.text) return null;
    const effect = this.pendingEffect;
    this.pendingEffect = undefined;
    return {
      key: `${this.messageId}:${this.count++}`,
      messageId: this.messageId,
      role: "assistant",
      kind: line.type,
      speakerId: line.type === "dialogue" ? line.characterId : null,
      speakerName: line.type === "dialogue" ? line.name : null,
      text: applyMacros(line.text, this.macros),
      stage: this.stage,
      ...(effect && { effect }),
    };
  }
}

// The user's message on stage: spoken parts with their name plate, *actions* as narration.
export function userBeats(message: BeatMessage, userName: string, stage: StageState): Beat[] {
  const segments = splitUserText(message.content, userName);
  const list = segments.length ? segments : [{ kind: "say" as const, text: message.content }];
  return list.map((s, i) => ({
    key: `${message.id}:${i}`,
    messageId: message.id,
    role: "user",
    kind: s.kind === "say" ? "user" : "narration",
    speakerId: null,
    speakerName: s.kind === "say" ? userName : null,
    text: s.text,
    stage,
  }));
}

// Takes silent sprites off the stage when the scene box says they are not here. Whoever speaks walks back in.
function keepPresent(stage: StageState, present: Set<string>): StageState {
  const slots = { ...stage.slots };
  for (const p of POSITIONS) if (slots[p] && !present.has(slots[p]!.characterId)) slots[p] = null;
  return { ...stage, slots };
}

export function buildBeats(
  messages: BeatMessage[],
  parserCtx: ParserContext,
  stageOpts: StageOptions,
  startStage: StageState,
  macros: Macros,
  userName: string,
  // Cast members the scene box lists as present (its Present: line), or null when it doesn't say.
  // The scene box is updated after each reply, so it is applied from the latest reply on.
  present: Set<string> | null = null,
): { beats: Beat[]; finalStage: StageState } {
  let stage = startStage;
  const beats: Beat[] = [];
  const latest = messages.findLastIndex((m) => m.role === "assistant");
  // Who the user's last message brought in. The scene box may not list them yet, so they stay.
  let arrived = new Set<string>();
  for (const [i, message] of messages.entries()) {
    if (message.role === "user") {
      const actions = stageOpts.mode === "narrative" ? splitUserText(message.content, userName).filter((s) => s.kind === "do") : [];
      const parser = new ScriptParser(parserCtx);
      // Someone arriving in the user's own actions ("Ishtar manages to come in") is on stage as the line shows.
      arrived = new Set();
      for (const s of actions) {
        for (const arrive of parser.arrivalsIn(s.text)) {
          stage = applyLine(stage, arrive, stageOpts);
          if (arrive.type === "arrive") arrived.add(arrive.characterId);
        }
      }
      beats.push(...userBeats(message, userName, stage));
      // Someone leaving in the user's own actions ("BB is gone") leaves the stage after them.
      for (const s of actions) for (const exit of parser.exitsIn(s.text)) stage = applyLine(stage, exit, stageOpts);
      continue;
    }
    if (i === latest && present && stageOpts.mode === "narrative") stage = keepPresent(stage, new Set([...present, ...arrived]));
    arrived = new Set();
    const builder = new BeatBuilder(message.id, parserCtx, stageOpts, stage, macros);
    beats.push(...builder.pushText(message.content));
    stage = builder.stage;
  }
  return { beats, finalStage: stage };
}
