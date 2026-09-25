"use client";

import { SpriteView } from "@/components/sprite/SpriteView";
import { resolveCell, spriteAspect } from "@/components/sprite/sheet";
import { useFadeLayers } from "@/components/sprite/useFadeLayers";
import type { Position } from "@/lib/parser/types";
import type { SlotState } from "@/lib/stage";
import type { CharacterView, SpriteSetView } from "@/lib/types";

export interface SlotContent {
  slot: SlotState;
  character: CharacterView;
  set: SpriteSetView;
}

function Sprite({ content, position, dim, leaving }: { content: SlotContent; position: Position; dim: boolean; leaving: boolean }) {
  const { set, slot } = content;
  return (
    <div
      className={`sprite-slot pointer-events-none ${leaving ? "fade-out" : "fade-in"}`}
      data-pos={position}
      data-dim={dim}
      style={{ ["--ar" as string]: spriteAspect(set) }}
    >
      <SpriteView grid={set} sheetUrl={set.sheetUrl} cell={resolveCell(set, slot.expression)} className="h-full w-full" />
    </div>
  );
}

// One stage position. A new character fades in; the old one fades out.
export function CharacterSlot({ position, content, dim }: { position: Position; content: SlotContent | null; dim: boolean }) {
  const key = content ? `${content.character.id}:${content.set.id}` : null;
  const layers = useFadeLayers(content, key, 350);
  return (
    <>
      {layers.map((l) => (
        <Sprite key={l.key} content={l.value} position={position} dim={dim && !l.leaving} leaving={l.leaving} />
      ))}
    </>
  );
}
