import { z } from "zod";

// A moment card: what was on screen when the reader kept it.
export const momentSpriteSchema = z.object({
  sheetUrl: z.string().max(2000),
  cell: z.number().int(),
  grid: z.object({
    sheetWidth: z.number().int().positive(),
    sheetHeight: z.number().int().positive(),
    bodyHeight: z.number().int().positive(),
    cellSize: z.number().int().positive(),
    columns: z.number().int().positive(),
    faceCount: z.number().int().min(0),
    faceX: z.number(),
    faceY: z.number(),
  }),
});
export type MomentSprite = z.infer<typeof momentSpriteSchema>;

export const momentInputSchema = z.object({
  sessionId: z.string().nullable(),
  storyTitle: z.string().max(200),
  imageUrl: z.string().max(2000),
  sprite: momentSpriteSchema.nullable(),
  speaker: z.string().max(120),
  color: z.string().max(40),
  text: z.string().trim().min(1, "There's no line on screen to keep").max(2000),
  narration: z.boolean(),
});
export type MomentInput = z.infer<typeof momentInputSchema>;

export interface MomentView extends MomentInput {
  id: string;
  createdAt: string;
  // The story still exists, so the card can link to it.
  storyExists: boolean;
}
