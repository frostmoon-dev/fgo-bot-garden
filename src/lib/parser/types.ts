export type Mode = "narrative" | "dialogue";
export type Position = "left" | "center" | "right";
export const POSITIONS: Position[] = ["left", "center", "right"];

// Screen effects the model may trigger: {effect:shake}.
export const EFFECTS = ["shake", "flash", "fade"] as const;
export type Effect = (typeof EFFECTS)[number];

export type ScriptLine =
  | { type: "effect"; effect: Effect }
  | { type: "dialogue"; characterId: string | null; name: string; expression: string; text: string }
  | { type: "narration"; text: string }
  | { type: "scene"; backgroundKey: string }
  | { type: "enter"; characterId: string; position: Position }
  | { type: "exit"; characterId: string }
  // Narration brought them into the scene: they take a free spot, and stay put if already on stage.
  | { type: "arrive"; characterId: string };

export interface ParserCharacter {
  id: string;
  name: string;
  aliases: string[];
  expressions: string[];
}

export interface ParserContext {
  characters: ParserCharacter[];
  backgrounds: string[];
  mode: Mode;
  mainCharacterId: string;
  userName: string;
  // What the characters call the user ("Senpai", "Master"). Tags with these names are the user too.
  userAliases?: string[];
  warn?: (message: string) => void;
}
