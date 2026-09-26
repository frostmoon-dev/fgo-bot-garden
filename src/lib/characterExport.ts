import { z } from "zod";

// Definition fields shared by the character and each ascension. Older files lack some; they default to "".
const profile = {
  description: z.string().default(""),
  personality: z.string().default(""),
  speechStyle: z.string().default(""),
  lore: z.string().default(""),
  relationship: z.string().default(""),
  scenario: z.string().default(""),
  greeting: z.string().default(""),
  exampleDialogues: z.string().default(""),
  openingScene: z.string().default(""),
};

export const characterExportSchema = z.object({
  format: z.literal("fgo-bot-garden/character"),
  version: z.literal(1),
  character: z.object({
    name: z.string().trim().min(1).max(80),
    aliases: z.array(z.string()).default([]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c9a86a"),
    motion: z.string().default("expressive"),
    ...profile,
  }),
  expressions: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z0-9_-]+$/),
        label: z.string().default(""),
        description: z.string().default(""),
      }),
    )
    .default([]),
  // Each entry is one ascension: its sheet, its faces, and the definition fields it overrides.
  spriteSets: z
    .array(
      z.object({
        name: z.string().min(1),
        sheetUrl: z.string().min(1),
        sheetWidth: z.number().int(),
        sheetHeight: z.number().int(),
        bodyHeight: z.number().int(),
        cellSize: z.number().int(),
        columns: z.number().int(),
        faceCount: z.number().int(),
        faceX: z.number().int(),
        faceY: z.number().int(),
        faces: z.record(z.string(), z.number().int()).default({}),
        motion: z.string().default(""),
        ...profile,
      }),
    )
    .default([]),
  defaultSpriteSet: z.string().nullable().default(null),
  defaultBackgroundKey: z.string().nullable().default(null),
  // Lorebook entries that came with the character (from a character card's own lorebook). Added to the lorebook.
  lorebook: z
    .array(z.object({ title: z.string().default(""), keywords: z.array(z.string()).default([]), content: z.string().min(1) }))
    .default([]),
});

export type CharacterExport = z.input<typeof characterExportSchema>;
