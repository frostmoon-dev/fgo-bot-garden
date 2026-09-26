import { ScriptParser, toScript } from "./scriptParser";
import type { ParserContext } from "./types";

// A stored reply rewritten in the canonical script format, for the prompt history.
export function canonicalize(text: string, ctx: ParserContext): string {
  const lines = new ScriptParser({ ...ctx, warn: undefined }).parseText(text);
  return toScript(lines, ctx.characters);
}

// A stored reply as plain "Name: words" lines, for the summarizer. Fewer tokens than the script format.
export function toTranscript(text: string, ctx: ParserContext): string {
  return new ScriptParser({ ...ctx, warn: undefined })
    .parseText(text)
    .flatMap((l) => {
      if (l.type === "dialogue") return l.text ? [`${l.name}: ${l.text}`] : [];
      if (l.type === "narration") return [l.text];
      return [];
    })
    .join("\n");
}
