"use client";

import { useState } from "react";
import type { CharacterView } from "@/lib/types";
import { NewSpriteSetForm } from "./NewSpriteSetForm";
import { SpriteSetEditor } from "./SpriteSetEditor";

export function SpritesTab({ character }: { character: CharacterView }) {
  const [selectedId, setSelectedId] = useState<string | null>(character.spriteSets[0]?.id ?? null);
  const selected = character.spriteSets.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-2">
        {character.spriteSets.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            className={`min-h-10 rounded-lg border px-4 text-sm ${s.id === selectedId ? "border-accent bg-accent-soft font-medium" : "border-line hover:border-muted"}`}
          >
            {s.name}
            {s.id === character.defaultSpriteSetId && <span className="ml-1.5 text-xs text-muted">default</span>}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className={`min-h-10 rounded-lg border border-dashed px-4 text-sm ${selectedId === null ? "border-accent bg-accent-soft font-medium" : "border-line text-muted hover:text-ink"}`}
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
