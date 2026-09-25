"use client";

import { useState } from "react";
import type { CharacterView } from "@/lib/types";
import { NewSpriteSetForm } from "./NewSpriteSetForm";
import { SpriteSetEditor } from "./SpriteSetEditor";

export function SpritesTab({ character }: { character: CharacterView }) {
  const [selectedId, setSelectedId] = useState<string | null>(character.spriteSets[0]?.id ?? null);
  const selected = character.spriteSets.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {character.spriteSets.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            className={`rounded-md border px-3 py-1.5 text-sm ${s.id === selectedId ? "border-gold text-gold" : "border-night-3 hover:border-gold-dim"}`}
          >
            {s.name}
            {s.id === character.defaultSpriteSetId && <span className="ml-1 text-xs text-ink-dim">(default)</span>}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className={`rounded-md border border-dashed px-3 py-1.5 text-sm ${selectedId === null ? "border-gold text-gold" : "border-night-3"}`}
        >
          + New sheet
        </button>
      </div>
      {selected ? (
        <SpriteSetEditor
          key={`${selected.id}:${character.expressions.map((e) => e.key).join(",")}`}
          set={selected}
          expressions={character.expressions}
        />
      ) : (
        <NewSpriteSetForm characterId={character.id} onCreated={setSelectedId} />
      )}
    </div>
  );
}
