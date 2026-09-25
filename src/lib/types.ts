// Plain data shapes shared by server and client.
import type { Mode } from "@/lib/parser/types";

export interface ExpressionView {
  id: string;
  key: string;
  label: string;
  description: string;
}

export interface SpriteSetView {
  id: string;
  name: string;
  sheetUrl: string;
  sheetWidth: number;
  sheetHeight: number;
  bodyHeight: number;
  cellSize: number;
  columns: number;
  faceCount: number;
  faceX: number;
  faceY: number;
  // expression key -> cell index (-1 = face drawn on the body)
  faces: Record<string, number>;
}

export interface CharacterView {
  id: string;
  name: string;
  aliases: string[];
  color: string;
  description: string;
  personality: string;
  speechStyle: string;
  lore: string;
  relationship: string;
  scenario: string;
  greeting: string;
  exampleDialogues: string;
  defaultSpriteSetId: string | null;
  defaultBackgroundId: string | null;
  expressions: ExpressionView[];
  spriteSets: SpriteSetView[];
}

export interface BackgroundView {
  id: string;
  key: string;
  label: string;
  imageUrl: string;
  description: string;
}

export interface PersonaView {
  name: string;
  description: string;
  addressAs: string;
}

export interface SettingsView {
  temperature: number;
  maxTokens: number;
  textSpeed: number;
  autoSpeed: number;
  uiScale: number;
  loreScanDepth: number;
  contextBudget: number;
  keepRecent: number;
  devMode: boolean;
}

export interface MessageView {
  id: string;
  order: number;
  role: "user" | "assistant";
  activeVariant: number;
  variants: { id: string; content: string }[];
}

export interface SaveSlotView {
  slot: number;
  label: string;
  createdAt: string;
}

export interface SessionView {
  id: string;
  title: string;
  mode: Mode;
  mainCharacterId: string;
  backgroundId: string | null;
  summary: string;
  summarizedUntil: number;
  cast: { characterId: string; spriteSetId: string | null }[];
  messages: MessageView[];
  saves: SaveSlotView[];
}

export function activeContent(message: MessageView): string {
  return message.variants[message.activeVariant]?.content ?? message.variants.at(-1)?.content ?? "";
}
