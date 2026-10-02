import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BOTS } from "../../../prisma/bots";
import { ScriptParser } from "../parser/scriptParser";
import type { ParserContext } from "../parser/types";

// The built-in bots' greetings and sample lines must reach the stage intact: every line parsed, every
// speaker recognised, every expression one the character has a face for.
describe.each(BOTS.map((b) => [b.name, b] as const))("%s", (_, bot) => {
  const warnings: string[] = [];
  const ctx: ParserContext = {
    characters: [{ id: "self", name: bot.name, aliases: bot.aliases, expressions: bot.expressions.map((e) => e.key) }],
    backgrounds: [],
    mode: "narrative",
    mainCharacterId: "self",
    userName: "{{user}}",
    warn: (m) => warnings.push(m),
  };
  const texts = [bot.profile.greeting, bot.profile.exampleDialogues, ...bot.spriteSets.flatMap((s) => [s.overrides?.greeting ?? "", s.overrides?.exampleDialogues ?? ""])];

  it("parses its greetings and samples without repairs or drops", () => {
    for (const text of texts.filter(Boolean)) {
      const lines = text.split("\n");
      const parsed = new ScriptParser(ctx).parseText(text);
      expect(parsed).toHaveLength(lines.length);
      for (const line of parsed) if (line.type === "dialogue") expect(line.characterId).toBe("self");
    }
    expect(warnings).toEqual([]);
  });

  // A renamed or deleted sheet makes the character silently lose their sprite in the app (and in every
  // database that was seeded with the old path).
  it("points every ascension at a sprite sheet that exists", () => {
    for (const set of bot.spriteSets) {
      if (!set.sheetUrl.startsWith("/")) continue;
      expect(existsSync(path.join(process.cwd(), "public", set.sheetUrl)), `${set.name}: ${set.sheetUrl}`).toBe(true);
    }
  });

  it("has a face for every expression in every ascension", () => {
    for (const set of bot.spriteSets) {
      for (const [key, cell] of Object.entries(set.faces)) {
        expect(bot.expressions.some((e) => e.key === key)).toBe(true);
        expect(cell).toBeLessThan(set.faceCount);
      }
      expect(Object.keys(set.faces)).toContain("neutral");
    }
  });
});
