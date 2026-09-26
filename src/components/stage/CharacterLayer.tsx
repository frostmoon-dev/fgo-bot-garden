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
}: {
  stage: StageState;
  characters: Record<string, CharacterView>;
  session: SessionView;
  speakerId: string | null;
}) {
  const someoneSpeaks = !!speakerId && POSITIONS.some((p) => stage.slots[p]?.characterId === speakerId);
  return (
    <div className="absolute inset-0 overflow-hidden">
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
            position={position}
            content={content}
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
