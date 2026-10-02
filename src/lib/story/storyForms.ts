import { ScriptParser } from "@/lib/parser";
import type { Mode, ParserCharacter } from "@/lib/parser/types";

// The ascension each character ends up in after these replies: the last {form:…} line (or Menu switch) wins.
// Characters whose form never changed in them are left out.
export function latestForms(replies: string[], characters: ParserCharacter[], mode: Mode): Map<string, string> {
  const out = new Map<string, string>();
  if (!characters.some((c) => (c.forms?.length ?? 0) > 1)) return out;
  const parser = new ScriptParser({ characters, backgrounds: [], mode, mainCharacterId: "", userName: "" });
  for (const text of replies) {
    if (!/\{\s*form\s*:|changes form:/i.test(text)) continue;
    for (const line of parser.parseText(text)) if (line.type === "form") out.set(line.characterId, line.spriteSetId);
  }
  return out;
}
