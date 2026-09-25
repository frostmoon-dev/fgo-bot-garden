import type { ParserContext } from "../types";

export function makeCtx(overrides: Partial<ParserContext> = {}) {
  const warnings: string[] = [];
  const ctx: ParserContext = {
    characters: [
      { id: "bb", name: "BB", aliases: ["BB-chan"], expressions: ["neutral", "smirk", "angry"] },
      { id: "oberon", name: "Oberon", aliases: ["Vortigern"], expressions: ["neutral", "smile"] },
    ],
    backgrounds: ["chaldea_hall", "moon_cell"],
    mode: "narrative",
    mainCharacterId: "bb",
    userName: "Ritsuka",
    warn: (m) => warnings.push(m),
    ...overrides,
  };
  return { ctx, warnings };
}
