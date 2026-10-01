"use client";

import { useEffect, useRef } from "react";
import { useFaceCenter } from "./faceCenter";
import { SpriteView } from "@/components/sprite/SpriteView";
import { resolveCell, spriteAspect } from "@/components/sprite/sheet";
import { useFadeLayers } from "@/components/sprite/useFadeLayers";
import { motionFor, motionKeyframes, type MotionStyle } from "@/lib/motion";
import type { Position } from "@/lib/parser/types";
import type { SlotState } from "@/lib/stage";
import type { CharacterView, SpriteSetView } from "@/lib/types";

export interface SlotContent {
  slot: SlotState;
  character: CharacterView;
  set: SpriteSetView;
  motion: MotionStyle;
}

function Sprite({
  content,
  position,
  dim,
  front,
  solo,
  offstage,
  leaving,
  moveKey,
}: {
  content: SlotContent;
  position: Position;
  dim: boolean;
  solo: boolean;
  offstage: boolean;
  front: boolean;
  leaving: boolean;
  moveKey: string | null;
}) {
  const { set, slot, motion: style } = content;
  const body = useRef<HTMLDivElement>(null);
  const faceX = useFaceCenter(set);

  // A move when this character starts talking or changes expression, picked by the feeling and the
  // character's motion style (a jump when startled, a shake in anger; nothing for "still").
  useEffect(() => {
    if (!moveKey || !body.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const motion = motionFor(style, slot.expression);
    if (!motion) return;
    const { frames, options } = motionKeyframes(motion, style);
    body.current.animate(frames, options);
  }, [moveKey, style, slot.expression]);

  return (
    <div
      className={`sprite-slot pointer-events-none ${leaving ? "sprite-leave" : "sprite-enter"}`}
      data-pos={position}
      data-dim={dim}
      data-front={front}
      data-solo={solo}
      data-offstage={offstage}
      // Where the face is across the image (0–1): on a phone the face, not the image, is centred.
      // And how far down (0–1): on wide screens the face, not the image, decides the height (see .sprite-slot).
      style={{
        ["--ar" as string]: spriteAspect(set),
        ["--face-x" as string]: faceX,
        ["--face-y" as string]: Math.min(0.6, Math.max(0.05, (set.faceY + set.cellSize / 2) / set.bodyHeight)),
      }}
    >
      <div ref={body} className="sprite-body">
        <SpriteView grid={set} sheetUrl={set.sheetUrl} cell={resolveCell(set, slot.expression)} className="h-full w-full" />
      </div>
    </div>
  );
}

// One stage position. A new character fades in; the old one fades out.
export function CharacterSlot({
  position,
  content,
  dim,
  front,
  solo,
  offstage = false,
  moveKey,
}: {
  position: Position;
  content: SlotContent | null;
  dim: boolean;
  solo: boolean;
  // Present in the scene but not shown: with three on stage, only two are on screen at once.
  offstage?: boolean;
  // The speaker stands in front, so a neighbour's wide sprite never covers them.
  front: boolean;
  moveKey: string | null;
}) {
  const key = content ? `${content.character.id}:${content.set.id}` : null;
  const layers = useFadeLayers(content, key, 350);
  return (
    <>
      {layers.map((l) => (
        <Sprite key={l.key} content={l.value} position={position} dim={dim && !l.leaving} front={front && !l.leaving} solo={solo && !l.leaving} offstage={offstage && !l.leaving} leaving={l.leaving} moveKey={l.leaving ? null : moveKey} />
      ))}
    </>
  );
}
