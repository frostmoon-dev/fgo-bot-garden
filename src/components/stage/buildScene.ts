import { userAliases, type ParserContext } from "@/lib/parser";
import { presentIds } from "@/lib/story/formerCast";
import { buildBeats, initialStage, type Beat, type StageState } from "@/lib/stage";
import { activeContent, type BackgroundView, type CharacterView, type MessageView, type PersonaView, type SessionView } from "@/lib/types";

export interface SceneData {
  session: SessionView;
  characters: Record<string, CharacterView>;
  backgrounds: BackgroundView[];
  persona: PersonaView;
  // With the scene tracker off the scene box can be stale, so it doesn't decide who is on stage.
  settings?: { sceneTracker: boolean };
}

export interface Scene {
  beats: Beat[];
  stageBeats: Beat[];
  startStage: StageState;
  warnings: string[];
}

export function castCharacters(data: SceneData): CharacterView[] {
  return data.session.cast.map((c) => data.characters[c.characterId]).filter((c): c is CharacterView => !!c);
}

export function startStage(data: SceneData): StageState {
  const main = data.characters[data.session.mainCharacterId];
  const bgId = data.session.backgroundId ?? main?.defaultBackgroundId ?? null;
  const bg = data.backgrounds.find((b) => b.id === bgId);
  return initialStage(bg?.key ?? null, data.session.mainCharacterId);
}

// Re-parses the whole history into beats. Cheap enough to run on every change.
export function buildScene(data: SceneData, messages: MessageView[]): Scene {
  const warnings: string[] = [];
  const cast = castCharacters(data);
  const main = data.characters[data.session.mainCharacterId];
  const ctx: ParserContext = {
    characters: cast.map((c) => ({ id: c.id, name: c.name, aliases: c.aliases, expressions: c.expressions.map((e) => e.key) })),
    backgrounds: data.backgrounds.map((b) => b.key),
    mode: data.session.mode,
    mainCharacterId: data.session.mainCharacterId,
    userName: data.persona.name,
    userAliases: userAliases(data.persona.addressAs),
    warn: (m) => warnings.push(m),
  };
  const start = startStage(data);
  const { beats } = buildBeats(
    messages.map((m) => ({ id: m.id, role: m.role, content: activeContent(m) })),
    ctx,
    { mode: data.session.mode, mainCharacterId: data.session.mainCharacterId },
    start,
    { user: data.persona.name, char: main?.name ?? "" },
    data.persona.name,
    // Silent sprites the scene box says are not here leave the stage (e.g. after a time skip in your message).
    data.settings?.sceneTracker === false ? null : presentIds(data.session.scene, cast),
  );
  // Your own lines are part of the stage too: they show in the textbox with your name plate.
  return { beats, stageBeats: beats, startStage: start, warnings };
}
