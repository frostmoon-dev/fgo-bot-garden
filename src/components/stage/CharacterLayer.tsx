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
  // Who stays visible when a phone screen is too narrow for more than one (see .sprite-slot[data-solo]).
  focusId: string | null;
}) {
  const someoneSpeaks = !!speakerId && POSITIONS.some((p) => stage.slots[p]?.characterId === speakerId);
  const occupied = POSITIONS.filter((p) => stage.slots[p]);
  // On a phone (portrait), two or more don't fit at the stage's sprite size: only one shows (CSS, data-count).
  const shared = occupied.length >= 2;
  // Nobody has spoken yet: the one in the middle, else the first on stage.
  const solo = focusId ?? stage.slots.center?.characterId ?? (occupied[0] ? stage.slots[occupied[0]]!.characterId : null);
  return (
    <div className="absolute inset-0 overflow-hidden" data-count={occupied.length}>
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
            solo={shared && !!slot && slot.characterId === solo}
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
