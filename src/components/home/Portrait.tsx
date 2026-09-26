"use client";

import { useEffect, useState } from "react";
import { faceCenter, type FacePoint } from "@/components/sprite/faceCenter";
import { Face, FaceThumb } from "@/components/sprite/SpriteView";
import { displaySheetUrl, resolveCell } from "@/components/sprite/sheet";
import type { CharacterView } from "@/lib/types";

// The square around the face: a little wider than a face cell, so the hair shows, with the face centre a
// little below the middle. Every portrait is framed the same way, whatever the sheet's own face cells show.
const ZOOM = 1.2;
const FACE_AT = 0.55;

export function Portrait({ character, className = "" }: { character: CharacterView; className?: string }) {
  const set = character.spriteSets.find((s) => s.id === character.defaultSpriteSetId) ?? character.spriteSets[0];
  const [centre, setCentre] = useState<FacePoint | null>(null);

  useEffect(() => {
    if (!set) return;
    let live = true;
    void faceCenter(set.sheetUrl, set).then((p) => live && setCentre(p));
    return () => {
      live = false;
    };
  }, [set]);

  if (!set) {
    return (
      <div className={`flex items-center justify-center bg-raised text-2xl font-semibold text-muted ${className}`}>
        {character.name.slice(0, 1)}
      </div>
    );
  }
  const cell = resolveCell(set, "neutral");
  // Until the face is found (or when it can't be), the neutral face cell as the sheet frames it.
  if (!centre) return <FaceThumb grid={set} sheetUrl={set.sheetUrl} cell={cell} className={`bg-raised ${className}`} />;

  const size = Math.min(set.cellSize * ZOOM, set.sheetWidth, set.bodyHeight);
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(0, max));
  const x = clamp(set.faceX + centre.x * set.cellSize - size / 2, set.sheetWidth - size);
  const y = clamp(set.faceY + centre.y * set.cellSize - size * FACE_AT, set.bodyHeight - size);
  return (
    <svg viewBox={`${x} ${y} ${size} ${size}`} className={`bg-raised ${className}`} role="img" aria-label={character.name}>
      <image href={displaySheetUrl(set.sheetUrl, set)} width={set.sheetWidth} height={set.sheetHeight} />
      {cell >= 0 && <Face grid={set} sheetUrl={set.sheetUrl} cell={cell} />}
    </svg>
  );
}
