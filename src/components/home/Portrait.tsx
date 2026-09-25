import { FaceThumb } from "@/components/sprite/SpriteView";
import { resolveCell } from "@/components/sprite/sheet";
import type { CharacterView } from "@/lib/types";

export function Portrait({ character, className = "" }: { character: CharacterView; className?: string }) {
  const set = character.spriteSets.find((s) => s.id === character.defaultSpriteSetId) ?? character.spriteSets[0];
  if (!set) {
    return (
      <div className={`flex items-center justify-center bg-night-3 font-display text-3xl ${className}`} style={{ color: character.color }}>
        {character.name.slice(0, 1)}
      </div>
    );
  }
  return <FaceThumb grid={set} sheetUrl={set.sheetUrl} cell={resolveCell(set, "neutral")} className={`bg-night-3 ${className}`} />;
}
