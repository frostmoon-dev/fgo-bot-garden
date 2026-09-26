import { ScriptParser, type Effect, type ParserContext, type ScriptLine } from "@/lib/parser";
import { splitUserText } from "@/lib/userInput";
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

export function buildBeats(
  messages: BeatMessage[],
  parserCtx: ParserContext,
  stageOpts: StageOptions,
  startStage: StageState,
  macros: Macros,
  userName: string,
): { beats: Beat[]; finalStage: StageState } {
  let stage = startStage;
  const beats: Beat[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      beats.push(...userBeats(message, userName, stage));
      continue;
    }
    const builder = new BeatBuilder(message.id, parserCtx, stageOpts, stage, macros);
    beats.push(...builder.pushText(message.content));
    stage = builder.stage;
  }
  return { beats, finalStage: stage };
}
