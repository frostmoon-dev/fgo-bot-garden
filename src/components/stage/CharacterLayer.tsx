"use client";

import { memo } from "react";
import { POSITIONS } from "@/lib/parser/types";
import type { StageState } from "@/lib/stage";
import type { CharacterView, SessionView } from "@/lib/types";
import { CharacterSlot, type SlotContent } from "./CharacterSlot";

function spriteSetFor(character: CharacterView, session: SessionView) {
  const chosen = session.cast.find((c) => c.characterId === character.id)?.spriteSetId;
  return (
    character.spriteSets.find((s) => s.id === chosen) ??
    character.spriteSets.find((s) => s.id === character.defaultSpriteSetId) ??
    character.spriteSets[0] ??
    null
  );
}

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
        const set = character ? spriteSetFor(character, session) : null;
        const content: SlotContent | null = slot && character && set ? { slot, character, set } : null;
        return (
          <CharacterSlot
            key={position}
            position={position}
            content={content}
            dim={someoneSpeaks && slot?.characterId !== speakerId}
          />
        );
      })}
    </div>
  );
});
