"use client";

import Link from "next/link";
import { useState } from "react";
import type { Mode } from "@/lib/parser/types";
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
    <ul className="space-y-2">
      {all.map((c) => {
        const entry = session.cast.find((x) => x.characterId === c.id);
        const isMain = c.id === session.mainCharacterId;
        return (
          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-md border border-night-3 p-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              <input type="checkbox" checked={!!entry} disabled={isMain} onChange={(e) => toggle(c.id, e.target.checked)} />
              <span style={{ color: c.color }}>{c.name}</span>
              {isMain && <span className="text-xs text-ink-dim">(main)</span>}
            </label>
            {entry && c.spriteSets.length > 0 && (
              <select
                className="field w-auto py-1 text-sm"
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
      <div className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Title</h3>
          <div className="flex gap-2">
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            <button
              type="button"
              className="rounded border border-night-3 px-3 text-sm hover:border-gold"
              disabled={!title.trim() || title === session.title}
              onClick={() => patchSession({ title: title.trim() })}
            >
              Rename
            </button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Mode</h3>
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
                className={`rounded-md border p-3 text-left ${session.mode === mode ? "border-gold bg-gold/10" : "border-night-3 hover:border-gold-dim"}`}
              >
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-ink-dim">{hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Starting background</h3>
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
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Cast</h3>
            <p className="text-xs text-ink-dim">Characters the AI may bring on stage. Their definitions are sent with every message.</p>
            <CastManager />
          </section>
        )}

        {session.summary && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Story summary (automatic)</h3>
            <p className="whitespace-pre-wrap rounded-md bg-night p-3 text-sm text-ink-dim">{session.summary}</p>
          </section>
        )}

        <Link href={`/characters/${session.mainCharacterId}`} className="inline-block text-sm text-gold underline">
          Edit the main character
        </Link>
      </div>
    </PanelShell>
  );
}
