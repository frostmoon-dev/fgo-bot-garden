"use client";

import Link from "next/link";
import { useState } from "react";
import type { Mode } from "@/lib/parser/types";
import { ColorDot } from "@/components/ui/ColorDot";
import { PanelShell } from "./PanelShell";
import { usePlay } from "./usePlay";

function CastManager() {
  const session = usePlay((s) => s.session);
  const characters = usePlay((s) => s.characters);
  const setCast = usePlay((s) => s.setCast);
  const all = Object.values(characters).sort((a, b) => a.name.localeCompare(b.name));

  const toggle = (id: string, on: boolean) =>
    setCast(
      on
        ? [...session.cast, { characterId: id, spriteSetId: null }]
        : session.cast.filter((c) => c.characterId !== id),
    );
  const setSprite = (id: string, spriteSetId: string | null) =>
    setCast(session.cast.map((c) => (c.characterId === id ? { ...c, spriteSetId } : c)));

  return (
    <ul className="divide-y divide-line">
      {all.map((c) => {
        const entry = session.cast.find((x) => x.characterId === c.id);
        const isMain = c.id === session.mainCharacterId;
        return (
          <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
            <label className="flex min-h-10 min-w-0 flex-1 items-center gap-3">
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={!!entry} disabled={isMain} onChange={(e) => toggle(c.id, e.target.checked)} />
              <ColorDot color={c.color} />
              <span>{c.name}</span>
              {isMain && <span className="text-sm text-muted">main</span>}
            </label>
            {entry && c.spriteSets.length > 0 && (
              <select
                className="field w-auto text-sm"
                value={entry.spriteSetId ?? ""}
                onChange={(e) => setSprite(c.id, e.target.value || null)}
                aria-label={`${c.name} sprite set`}
              >
                <option value="">Default sprites</option>
                {c.spriteSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function MenuPanel() {
  const session = usePlay((s) => s.session);
  const backgrounds = usePlay((s) => s.backgrounds);
  const patchSession = usePlay((s) => s.patchSession);
  const [title, setTitle] = useState(session.title);

  return (
    <PanelShell title="Menu">
      <div className="divide-y divide-line [&>section]:py-6 [&>section:first-child]:pt-2">
        <section>
          <h3 className="mb-3 font-medium">Title</h3>
          <div className="flex gap-2">
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            <button
              type="button"
              className="min-h-10 rounded-lg border border-line bg-raised px-4 text-sm disabled:opacity-40"
              disabled={!title.trim() || title === session.title}
              onClick={() => patchSession({ title: title.trim() })}
            >
              Rename
            </button>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-medium">Mode</h3>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["narrative", "Narrative", "Narration, scene changes, several characters."],
                ["dialogue", "Dialogue", "Only the main character talks. No narration."],
              ] as [Mode, string, string][]
            ).map(([mode, label, hint]) => (
              <button
                key={mode}
                type="button"
                onClick={() => patchSession({ mode })}
                className={`rounded-xl border p-4 text-left ${session.mode === mode ? "border-accent bg-accent-soft" : "border-line hover:border-muted"}`}
              >
                <span className="block font-medium">{label}</span>
                <span className="mt-1 block text-sm text-muted">{hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-medium">Starting background</h3>
          <select
            className="field"
            value={session.backgroundId ?? ""}
            onChange={(e) => patchSession({ backgroundId: e.target.value || null })}
          >
            <option value="">Character default</option>
            {backgrounds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label || b.key}
              </option>
            ))}
          </select>
        </section>

        {session.mode === "narrative" && (
          <section>
            <h3 className="font-medium">Cast</h3>
            <p className="mb-2 mt-1 text-sm text-muted">Characters the AI may bring on stage. Their definitions are sent with every message.</p>
            <CastManager />
          </section>
        )}

        {session.summary && (
          <section>
            <h3 className="mb-3 font-medium">Story summary</h3>
            <p className="card whitespace-pre-wrap p-4 text-sm text-muted">{session.summary}</p>
          </section>
        )}

        <section><Link href={`/characters/${session.mainCharacterId}`} className="text-sm underline underline-offset-4">
          Edit the main character
        </Link></section>
      </div>
    </PanelShell>
  );
}
