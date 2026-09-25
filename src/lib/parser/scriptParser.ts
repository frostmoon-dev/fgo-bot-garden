import { POSITIONS, type ParserCharacter, type ParserContext, type Position, type ScriptLine } from "./types";

const COMMAND = /\{\s*(scene|enter|exit)\s*:([^{}]*)\}/gi;
const LEADING_BRACES = /^\{[^{}]*\}/;
const DIALOGUE_TAG = /^\[([^\]|]+?)\s*(?:\|\s*([^\]]*?))?\s*\]\s*([\s\S]*)$/;
const NARRATION_TAG = /^\(narration\)\s*([\s\S]*)$/i;
const WRAPPED_NARRATION = /^(?:\(([\s\S]+)\)|\*([\s\S]+)\*)$/;

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

// Parses the AI's line-based output. Keeps the active speaker between lines.
export class ScriptParser {
  private activeSpeakerId: string | null = null;

  constructor(private readonly ctx: ParserContext) {}

  get activeSpeaker(): string | null {
    return this.activeSpeakerId;
  }

  parseText(text: string): ScriptLine[] {
    return text.split(/\r?\n/).flatMap((line) => this.parseLine(line));
  }

  parseLine(raw: string): ScriptLine[] {
    let rest = raw.trim();
    if (!rest) return [];

    const before: ScriptLine[] = [];
    let m: RegExpMatchArray | null;
    while ((m = rest.match(LEADING_BRACES))) {
      before.push(...this.command(m[0]));
      rest = rest.slice(m[0].length).trim();
    }

    // Commands written after the text still count; they run after the line.
    const after: ScriptLine[] = [];
    rest = rest
      .replace(COMMAND, (cmd) => {
        after.push(...this.command(cmd));
        return "";
      })
      .trim();

    const body = rest ? this.textLine(rest) : [];
    return [...before, ...body, ...after];
  }

  private textLine(text: string): ScriptLine[] {
    const tag = text.match(DIALOGUE_TAG);
    if (tag) return this.dialogue(tag[1], tag[2] ?? "", tag[3].trim());

    const narration = text.match(NARRATION_TAG);
    if (narration) return this.narration(narration[1].trim());

    const wrapped = text.match(WRAPPED_NARRATION);
    if (wrapped) return this.narration((wrapped[1] ?? wrapped[2]).trim());

    const speakerId = this.activeSpeakerId ?? this.ctx.mainCharacterId;
    const speaker = this.ctx.characters.find((c) => c.id === speakerId);
    if (!speaker) return this.narration(text);
    return [{ type: "dialogue", characterId: speaker.id, name: speaker.name, expression: "", text }];
  }

  private dialogue(rawName: string, rawExpression: string, text: string): ScriptLine[] {
    const name = rawName.trim();
    if (norm(name) === norm(this.ctx.userName) || name === "{{user}}") {
      this.warn(`Dropped a line written for the user's character: "${name}"`);
      return [];
    }
    const character = this.findCharacter(name);
    if (!character) {
      this.warn(`Unknown character "${name}" — text kept, no sprite change`);
      return [{ type: "dialogue", characterId: null, name, expression: "neutral", text }];
    }
    this.activeSpeakerId = character.id;
    return [
      {
        type: "dialogue",
        characterId: character.id,
        name: character.name,
        expression: this.resolveExpression(character, rawExpression),
        text,
      },
    ];
  }

  private narration(text: string): ScriptLine[] {
    if (!text) return [];
    if (this.ctx.mode === "dialogue") {
      this.warn("Narration dropped in dialogue mode");
      return [];
    }
    return [{ type: "narration", text }];
  }

  private command(raw: string): ScriptLine[] {
    const m = raw.match(/^\{\s*(\w+)\s*:([^{}]*)\}$/);
    if (!m) {
      this.warn(`Ignored unknown command ${raw}`);
      return [];
    }
    if (this.ctx.mode === "dialogue") {
      this.warn(`Command ${raw} ignored in dialogue mode`);
      return [];
    }
    const kind = m[1].toLowerCase();
    const args = m[2].split(":").map((a) => a.trim());

    if (kind === "scene") {
      const key = this.ctx.backgrounds.find((b) => norm(b) === norm(args[0] ?? ""));
      if (!key) {
        this.warn(`Unknown background "${args[0]}" — command ignored`);
        return [];
      }
      return [{ type: "scene", backgroundKey: key }];
    }

    if (kind === "enter" || kind === "exit") {
      const character = this.findCharacter(args[0] ?? "");
      if (!character) {
        this.warn(`Unknown character "${args[0]}" in ${raw} — command ignored`);
        return [];
      }
      if (kind === "exit") return [{ type: "exit", characterId: character.id }];
      const position = (args[1] ?? "").toLowerCase() as Position;
      if (!POSITIONS.includes(position)) {
        this.warn(`Unknown position "${args[1] ?? ""}" in ${raw} — using center`);
      }
      return [
        {
          type: "enter",
          characterId: character.id,
          position: POSITIONS.includes(position) ? position : "center",
        },
      ];
    }

    this.warn(`Ignored unknown command ${raw}`);
    return [];
  }

  private findCharacter(name: string): ParserCharacter | undefined {
    const key = norm(name);
    if (!key) return undefined;
    return this.ctx.characters.find(
      (c) => norm(c.name) === key || c.aliases.some((a) => norm(a) === key),
    );
  }

  private resolveExpression(character: ParserCharacter, raw: string): string {
    if (!raw.trim()) return "neutral";
    const found = character.expressions.find((e) => norm(e) === norm(raw));
    if (found) return found;
    this.warn(`Unknown expression "${raw}" for ${character.name} — using neutral`);
    return "neutral";
  }

  private warn(message: string) {
    this.ctx.warn?.(message);
  }
}
