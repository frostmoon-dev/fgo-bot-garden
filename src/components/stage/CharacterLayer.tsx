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
  subjectId = null,
  partnerId = null,
}: {
  stage: StageState;
  characters: Record<string, CharacterView>;
  session: SessionView;
  speakerId: string | null;
  // Who stays visible when a phone screen is too narrow for more than one (see .sprite-slot[data-solo]).
  focusId: string | null;
  // Who the narration on screen is about: they step to the front while nobody speaks.
  subjectId?: string | null;
  // Who the focus last exchanged lines with: with three on stage, the two of them are the ones shown.
  partnerId?: string | null;
}) {
  const someoneSpeaks = !!speakerId && POSITIONS.some((p) => stage.slots[p]?.characterId === speakerId);
  const all = POSITIONS.filter((p) => stage.slots[p]);
  // Three on stage don't fit side by side (wide sprites cover each other), so two are shown, as FGO frames
  // a scene: the focus and whoever they last exchanged lines with. The third steps out of view, and swaps
  // back in when they speak or the narration turns to them.
  const at = (id: string | null) => all.find((p) => stage.slots[p]!.characterId === id);
  const pair = new Set<string>();
  if (all.length >= 3) {
    const lead = at(focusId) ?? (stage.slots.center ? "center" : all[0]);
    pair.add(lead);
    pair.add(at(partnerId) && at(partnerId) !== lead ? at(partnerId)! : all.find((p) => p !== lead)!);
  }
  const occupied = all.length >= 3 ? all.filter((p) => pair.has(p)) : all;
  // On a phone (portrait), two or more don't fit at the stage's sprite size: only one shows (CSS, data-count).
  const shared = occupied.length >= 2;
  // Nobody has spoken yet: the one in the middle, else the first on stage.
  const solo = focusId ?? stage.slots.center?.characterId ?? (occupied[0] ? stage.slots[occupied[0]]!.characterId : null);
  return (
    <div className="absolute inset-0 overflow-hidden" data-count={occupied.length}>
      {POSITIONS.map((position) => {
        const slot = stage.slots[position];
        const character = slot ? characters[slot.characterId] : undefined;
        // A form the story switched to by this line, else the one chosen for the story.
        const chosen = (character && stage.forms?.[character.id]) ?? session.cast.find((c) => c.characterId === character?.id)?.spriteSetId;
        const set = character ? pickAscension(character, chosen) : null;
        const content: SlotContent | null =
          slot && character && set ? { slot, character, set, motion: resolveMotion(character.motion, set.motion) } : null;
        const speaking = !!slot && slot.characterId === speakerId;
        return (
          <CharacterSlot
            key={position}
            // Two share the screen half and half, whichever slots the story put them in.
            position={occupied.length === 2 && slot && occupied.includes(position) ? (occupied[0] === position ? "left" : "right") : position}
            offstage={!!slot && !occupied.includes(position)}
            content={content}
            solo={shared && !!slot && slot.characterId === solo}
            dim={someoneSpeaks && !speaking}
            front={speaking || (!someoneSpeaks && !!slot && slot.characterId === subjectId)}
            // Moves when they start talking or change expression, not on every line.
            moveKey={speaking ? slot.expression : null}
          />
        );
      })}
    </div>
  );
});
