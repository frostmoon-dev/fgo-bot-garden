import { pickAscension } from "@/lib/ascension";
import type { MomentInput } from "@/lib/moment";
import type { Beat } from "@/lib/stage/beats";
import { resolveCell } from "@/components/sprite/sheet";
import type { SceneData } from "./buildScene";

// What a moment card shows for the line on screen: its background, the character it is about (the speaker,
// else whoever is at the center, else anyone on stage) with their face at that moment, and the line itself.
export function momentFromBeat(data: SceneData, beat: Beat): MomentInput {
  const stage = beat.stage;
  const slots = Object.values(stage.slots).filter((s) => !!s);
  const slot =
    slots.find((s) => s.characterId === beat.speakerId) ?? stage.slots.center ?? slots[0] ?? null;
  const character = slot ? data.characters[slot.characterId] : undefined;
  const chosen = (character && stage.forms?.[character.id]) ?? data.session.cast.find((c) => c.characterId === character?.id)?.spriteSetId;
  const set = character ? pickAscension(character, chosen) : null;
  const speaker = beat.kind === "dialogue" ? (beat.speakerName ?? "") : beat.kind === "user" ? data.persona.name : "";
  return {
    sessionId: data.session.id,
    storyTitle: data.session.title,
    imageUrl: data.backgrounds.find((b) => b.key === stage.backgroundKey)?.imageUrl ?? "",
    sprite:
      set && slot
        ? {
            sheetUrl: set.sheetUrl,
            cell: resolveCell(set, slot.expression),
            grid: {
              sheetWidth: set.sheetWidth,
              sheetHeight: set.sheetHeight,
              bodyHeight: set.bodyHeight,
              cellSize: set.cellSize,
              columns: set.columns,
              faceCount: set.faceCount,
              faceX: set.faceX,
              faceY: set.faceY,
            },
          }
        : null,
    speaker,
    color: beat.kind === "dialogue" && beat.speakerId ? (data.characters[beat.speakerId]?.color ?? "") : "",
    text: beat.text,
    narration: beat.kind === "narration",
  };
}
