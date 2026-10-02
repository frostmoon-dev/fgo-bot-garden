import type { MusicCue } from "@/lib/music/library";
import { POSITIONS, type Mode, type Position, type ScriptLine } from "@/lib/parser/types";

export interface SlotState {
  characterId: string;
  expression: string;
}

export interface StageState {
  backgroundKey: string | null;
  slots: Record<Position, SlotState | null>;
  // Ascensions the story itself switched to ({form:…}), by character id. Others use the story's chosen one.
  forms?: Record<string, string>;
  // The AI's music cue for this reply ({music:…}). Cleared when the next reply starts.
  music?: MusicCue;
}

export interface StageOptions {
  mode: Mode;
  mainCharacterId: string;
}

export function emptyStage(backgroundKey: string | null): StageState {
  return { backgroundKey, slots: { left: null, center: null, right: null } };
}

export function initialStage(backgroundKey: string | null, mainCharacterId: string): StageState {
  const stage = emptyStage(backgroundKey);
  stage.slots.center = { characterId: mainCharacterId, expression: "neutral" };
  return stage;
}

function findSlot(stage: StageState, characterId: string): Position | null {
  return POSITIONS.find((p) => stage.slots[p]?.characterId === characterId) ?? null;
}

const AUTO_ENTER_ORDER: Position[] = ["center", "left", "right"];

export function applyLine(stage: StageState, line: ScriptLine, opts: StageOptions): StageState {
  const next: StageState = {
    backgroundKey: stage.backgroundKey,
    slots: { ...stage.slots },
    ...(stage.forms && { forms: stage.forms }),
    ...(stage.music && { music: stage.music }),
  };
  if (line.type === "music") {
    next.music = line.cue;
    return next;
  }
  if (line.type === "form") {
    next.forms = { ...stage.forms, [line.characterId]: line.spriteSetId };
    return next;
  }

  if (opts.mode === "dialogue") {
    // One character, always in the center.
    const current = findSlot(next, opts.mainCharacterId);
    const expression = current ? next.slots[current]!.expression : "neutral";
    next.slots = { left: null, right: null, center: { characterId: opts.mainCharacterId, expression } };
    if (line.type === "dialogue" && line.characterId === opts.mainCharacterId && line.expression) {
      next.slots.center = { characterId: opts.mainCharacterId, expression: line.expression };
    }
    return next;
  }

  switch (line.type) {
    // A new place or a time skip starts the scene over, as in FGO: the stage is cleared and
    // whoever speaks next walks back in, so nobody from the last scene stands in the way.
    case "scene":
      if (stage.backgroundKey && line.backgroundKey !== stage.backgroundKey) next.slots = emptyStage(null).slots;
      next.backgroundKey = line.backgroundKey;
      return next;
    case "effect":
      if (line.effect === "fade") next.slots = emptyStage(null).slots;
      return next;
    case "exit": {
      const at = findSlot(next, line.characterId);
      if (at) next.slots[at] = null;
      return next;
    }
    case "enter": {
      const at = findSlot(next, line.characterId);
      const expression = at ? next.slots[at]!.expression : "neutral";
      if (at) next.slots[at] = null;
      next.slots[line.position] = { characterId: line.characterId, expression };
      return next;
    }
    case "arrive": {
      if (findSlot(next, line.characterId)) return next;
      const free = AUTO_ENTER_ORDER.find((p) => !next.slots[p]) ?? "right";
      next.slots[free] = { characterId: line.characterId, expression: "neutral" };
      return next;
    }
    case "dialogue": {
      if (!line.characterId) return next;
      const at = findSlot(next, line.characterId);
      if (at) {
        next.slots[at] = {
          characterId: line.characterId,
          expression: line.expression || next.slots[at]!.expression,
        };
        return next;
      }
      // A speaker who is not on stage walks in.
      const free = AUTO_ENTER_ORDER.find((p) => !next.slots[p]) ?? "right";
      next.slots[free] = { characterId: line.characterId, expression: line.expression || "neutral" };
      return next;
    }
    default:
      return next;
  }
}
