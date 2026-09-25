import { ScriptParser, type ParserContext, type ScriptLine } from "@/lib/parser";
import { applyLine, type StageOptions, type StageState } from "./stage";

export interface Beat {
  key: string;
  messageId: string;
  role: "assistant" | "user";
  kind: "dialogue" | "narration" | "user";
  speakerId: string | null;
  speakerName: string | null;
  text: string;
  stage: StageState;
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
    return {
      key: `${this.messageId}:${this.count++}`,
      messageId: this.messageId,
      role: "assistant",
      kind: line.type,
      speakerId: line.type === "dialogue" ? line.characterId : null,
      speakerName: line.type === "dialogue" ? line.name : null,
      text: applyMacros(line.text, this.macros),
      stage: this.stage,
    };
  }
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
      beats.push({
        key: `${message.id}:0`,
        messageId: message.id,
        role: "user",
        kind: "user",
        speakerId: null,
        speakerName: userName,
        text: message.content,
        stage,
      });
      continue;
    }
    const builder = new BeatBuilder(message.id, parserCtx, stageOpts, stage, macros);
    beats.push(...builder.pushText(message.content));
    stage = builder.stage;
  }
  return { beats, finalStage: stage };
}
