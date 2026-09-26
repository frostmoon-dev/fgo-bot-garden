"use client";

import { useEffect, useRef } from "react";
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
  leaving,
  moveKey,
}: {
  content: SlotContent;
  position: Position;
  dim: boolean;
  solo: boolean;
  front: boolean;
  leaving: boolean;
  moveKey: string | null;
}) {
  const { set, slot, motion: style } = content;
  const body = useRef<HTMLDivElement>(null);

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
      className={`sprite-slot pointer-events-none ${leaving ? "fade-out" : "fade-in"}`}
      data-pos={position}
      data-dim={dim}
      data-front={front}
      data-solo={solo}
      style={{ ["--ar" as string]: spriteAspect(set) }}
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
  moveKey,
}: {
  position: Position;
  content: SlotContent | null;
  dim: boolean;
  solo: boolean;
  // The speaker stands in front, so a neighbour's wide sprite never covers them.
  front: boolean;
  moveKey: string | null;
}) {
  const key = content ? `${content.character.id}:${content.set.id}` : null;
  const layers = useFadeLayers(content, key, 350);
  return (
    <>
      {layers.map((l) => (
        <Sprite key={l.key} content={l.value} position={position} dim={dim && !l.leaving} front={front && !l.leaving} solo={solo && !l.leaving} leaving={l.leaving} moveKey={l.leaving ? null : moveKey} />
      ))}
    </>
  );
}
