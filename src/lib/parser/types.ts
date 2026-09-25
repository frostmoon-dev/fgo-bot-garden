export type Mode = "narrative" | "dialogue";
export type Position = "left" | "center" | "right";
export const POSITIONS: Position[] = ["left", "center", "right"];

export type ScriptLine =
  | { type: "dialogue"; characterId: string | null; name: string; expression: string; text: string }
  | { type: "narration"; text: string }
  | { type: "scene"; backgroundKey: string }
  | { type: "enter"; characterId: string; position: Position }
  | { type: "exit"; characterId: string };

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
  warn?: (message: string) => void;
}
