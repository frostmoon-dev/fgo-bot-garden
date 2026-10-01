// Plain data shapes shared by server and client.
import type { Mode } from "@/lib/parser/types";
import type { ExampleMode, MemoryPlacement, PromptProfile, ReplyLength } from "@/lib/prompt/builder";
import type { AscensionProfile } from "@/lib/ascension";
import type { NarrationStyle, FrameStyle } from "@/lib/appearance";

export interface ExpressionView {
  id: string;
  key: string;
  label: string;
  description: string;
}

// One ascension: a sprite sheet plus definition fields that override the character's profile.
export interface SpriteSetView extends AscensionProfile {
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
  // Motion style for this ascension; empty uses the character's (see lib/motion.ts).
  motion: string;
}

export interface CharacterView extends AscensionProfile {
  id: string;
  name: string;
  aliases: string[];
  color: string;
  motion: string;
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
  // A looping track for this background, or "".
  musicUrl: string;
}

export interface PersonaView {
  name: string;
  description: string;
  addressAs: string;
  role: string;
}

export type HelperModel = "main" | "light" | "all";

export interface SettingsView {
  temperature: number;
  maxTokens: number;
  textSpeed: number;
  autoSpeed: number;
  uiScale: number;
  windowOpacity: number;
  // Background music loudness, 0 to 1 (0 is off).
  musicVolume: number;
  // Characters may write private thoughts: (thought:Name) text.
  innerThoughts: boolean;
  // Which small background requests go to the backup model.
  helperModel: HelperModel;
  loreScanDepth: number;
  contextBudget: number;
  keepRecent: number;
  devMode: boolean;
  theme: string;
  customBg: string;
  font: string;
  narrationStyle: NarrationStyle;
  frameStyle: FrameStyle;
  promptProfile: PromptProfile;
  contextSize: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  memoryPlacement: MemoryPlacement;
  exampleMode: ExampleMode;
  formatReminder: boolean;
  stopAtUser: boolean;
  customPrompt: string;
  sceneTracker: boolean;
  autoChoices: boolean;
  characterMemory: boolean;
  replyLength: ReplyLength;
}

export interface MessageView {
  id: string;
  order: number;
  role: "user" | "assistant";
  activeVariant: number;
  pinned: boolean;
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
  memory: string;
  scene: string;
  // The scene the user wrote for this story, if it was started from Write a scene.
  premise: string;
  cast: { characterId: string; spriteSetId: string | null }[];
  messages: MessageView[];
  saves: SaveSlotView[];
}

export function activeContent(message: MessageView): string {
  return message.variants[message.activeVariant]?.content ?? message.variants.at(-1)?.content ?? "";
}
