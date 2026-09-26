"use client";

import { memo } from "react";
import { pickAscension } from "@/lib/ascension";
import { resolveMotion } from "@/lib/motion";
import { POSITIONS } from "@/lib/parser/types";
import type { StageState } from "@/lib/stage";
import type { CharacterView, SessionView } from "@/lib/types";
import { CharacterSlot, type SlotContent } from "./CharacterSlot";

export const CharacterLayer = memo(function CharacterLayer({
  stage,
  characters,
  session,
  speakerId,
  focusId,
}: {
  stage: StageState;
  characters: Record<string, CharacterView>;
  session: SessionView;
  speakerId: string | null;
  // Who stays visible when a phone screen is too narrow for three (see .sprite-slot[data-solo]).
  focusId: string | null;
}) {
  const someoneSpeaks = !!speakerId && POSITIONS.some((p) => stage.slots[p]?.characterId === speakerId);
  const occupied = POSITIONS.filter((p) => stage.slots[p]);
  const crowded = occupied.length >= 3;
  // Nobody has spoken yet: the one in the middle.
  const solo = focusId ?? stage.slots.center?.characterId ?? null;
  return (
    <div className="absolute inset-0 overflow-hidden" data-crowded={crowded}>
      {POSITIONS.map((position) => {
        const slot = stage.slots[position];
        const character = slot ? characters[slot.characterId] : undefined;
        const chosen = session.cast.find((c) => c.characterId === character?.id)?.spriteSetId;
        const set = character ? pickAscension(character, chosen) : null;
        const content: SlotContent | null =
          slot && character && set ? { slot, character, set, motion: resolveMotion(character.motion, set.motion) } : null;
        const speaking = !!slot && slot.characterId === speakerId;
        return (
          <CharacterSlot
            key={position}
            // Two share the screen half and half, whichever slots the story put them in.
            position={occupied.length === 2 && slot ? (occupied[0] === position ? "left" : "right") : position}
            content={content}
            solo={crowded && !!slot && slot.characterId === solo}
            dim={someoneSpeaks && !speaking}
            front={speaking}
            // Moves when they start talking or change expression, not on every line.
            moveKey={speaking ? slot.expression : null}
          />
        );
      })}
    </div>
  );
});
