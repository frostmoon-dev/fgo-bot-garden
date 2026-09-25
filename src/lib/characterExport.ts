import { z } from "zod";

export const characterExportSchema = z.object({
  format: z.literal("fgo-bot-garden/character"),
  version: z.literal(1),
  character: z.object({
    name: z.string().trim().min(1).max(80),
    aliases: z.array(z.string()).default([]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c9a86a"),
    description: z.string().default(""),
    personality: z.string().default(""),
    speechStyle: z.string().default(""),
    lore: z.string().default(""),
    relationship: z.string().default(""),
    scenario: z.string().default(""),
    greeting: z.string().default(""),
    exampleDialogues: z.string().default(""),
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
      }),
    )
    .default([]),
  defaultSpriteSet: z.string().nullable().default(null),
  defaultBackgroundKey: z.string().nullable().default(null),
});

export type CharacterExport = z.input<typeof characterExportSchema>;
