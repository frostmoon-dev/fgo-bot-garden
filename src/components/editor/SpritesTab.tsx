"use client";

import { useState } from "react";
import { FaceThumb } from "@/components/sprite/SpriteView";
import { resolveCell } from "@/components/sprite/sheet";
import type { CharacterView } from "@/lib/types";
import { AscensionForm } from "./AscensionForm";
import { NewSpriteSetForm } from "./NewSpriteSetForm";
import { SpriteSetEditor } from "./SpriteSetEditor";

type View = "definition" | "sheet";

// Ascensions: each is a sprite sheet plus its own definition (greeting, scenario, personality…).
export function SpritesTab({ character }: { character: CharacterView }) {
  const [selectedId, setSelectedId] = useState<string | null>(character.spriteSets[0]?.id ?? null);
  const [view, setView] = useState<View>("definition");
  const selected = character.spriteSets.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-2">
        {character.spriteSets.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            aria-pressed={s.id === selectedId}
            className={`flex min-h-12 items-center gap-2 rounded-lg border py-1 pl-1 pr-4 text-sm ${s.id === selectedId ? "border-accent bg-accent-soft font-medium" : "border-line hover:border-muted"}`}
          >
            <FaceThumb grid={s} sheetUrl={s.sheetUrl} cell={resolveCell(s, "neutral")} className="size-10 rounded bg-canvas" />
            {s.name}
            {s.id === character.defaultSpriteSetId && <span className="text-xs text-muted">default</span>}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className={`min-h-12 rounded-lg border border-dashed px-4 text-sm ${selectedId === null ? "border-accent bg-accent-soft font-medium" : "border-line text-muted hover:text-ink"}`}
        >
          + New ascension
        </button>
      </div>
      {selected ? (
        <div>
          <div role="tablist" aria-label={`${selected.name} sections`} className="mb-8 inline-flex rounded-lg border border-line p-1">
            {(
              [
                ["definition", "Definition"],
                ["sheet", "Sprite sheet"],
              ] as [View, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
                className={`min-h-9 rounded-md px-4 text-sm ${view === id ? "bg-raised font-medium text-ink" : "text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {view === "definition" ? (
            <AscensionForm key={selected.id} character={character} set={selected} />
          ) : (
            <SpriteSetEditor
              key={`${selected.id}:${character.expressions.map((e) => e.key).join(",")}`}
              set={selected}
              expressions={character.expressions}
            />
          )}
        </div>
      ) : (
        <NewSpriteSetForm characterId={character.id} onCreated={setSelectedId} />
      )}
    </div>
  );
}
