// The built-in bots, kept as files so their definitions are versioned and can be restored.
// Written to the database by prisma/seed-bots.ts.

export interface Profile {
  description: string;
  personality: string;
  speechStyle: string;
  lore: string;
  relationship: string;
  scenario: string;
  greeting: string;
  exampleDialogues: string;
  openingScene: string;
}

export interface BotExpression {
  key: string;
  label: string;
  // What the face looks like and when to use it. The model reads this to pick expressions.
  description: string;
}

export interface BotSpriteSet {
  name: string;
  sheetUrl: string;
  sheetWidth: number;
  sheetHeight: number;
  // Face position from the game's own data (Atlas Academy svtScript faceX/faceY). A position off by even
  // one pixel shows as a seam around the face when the expression changes.
  faceX: number;
  faceY: number;
  faceCount: number;
  // Expression key -> face cell. -1 is the face drawn on the body. Keys left out fall back to neutral.
  faces: Record<string, number>;
  // Definition fields this ascension replaces. Anything left out uses the character's profile.
  overrides?: Partial<Profile>;
  motion?: string;
}

export interface Bot {
  name: string;
  aliases: string[];
  color: string;
  motion: "expressive" | "bouncy" | "calm" | "still";
  profile: Profile;
  expressions: BotExpression[];
  spriteSets: BotSpriteSet[];
  defaultSpriteSet: string;
  defaultBackgroundKey: string | null;
}

export const SHEET = { bodyHeight: 768, cellSize: 256, columns: 4 } as const;
