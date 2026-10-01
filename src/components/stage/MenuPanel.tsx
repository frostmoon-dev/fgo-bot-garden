"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { restartStory } from "@/app/actions/sessions";
import { unwrap } from "@/lib/actionResult";
import type { Mode } from "@/lib/parser/types";
import { FaceThumb } from "@/components/sprite/SpriteView";
import { resolveCell } from "@/components/sprite/sheet";
import { ColorDot } from "@/components/ui/ColorDot";
import { pickAscension } from "@/lib/ascension";
import { bondLevel } from "@/lib/bond";
import { PanelShell } from "./PanelShell";
import { usePlay } from "./usePlay";

// The main character's ascensions. Switching one changes their definition, sprites and greeting.
function AscensionPicker() {
  const session = usePlay((s) => s.session);
  const main = usePlay((s) => s.characters[s.session.mainCharacterId]);
  const streaming = usePlay((s) => s.streaming);
  const switchAscension = usePlay((s) => s.switchAscension);
  if (!main || main.spriteSets.length < 2) return null;
  const current = pickAscension(main, session.cast.find((c) => c.characterId === main.id)?.spriteSetId);

  return (
    <section>
      <h3 className="font-title text-xl font-semibold">Ascension</h3>
      <p className="mb-3 mt-1 text-sm text-muted">
        {main.name}&apos;s form in this story. Each has its own definition. Before you reply, the first message switches to its greeting; later, the change is written into the story and {main.name} reacts to it in the next reply.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {main.spriteSets.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={streaming}
            aria-pressed={s.id === current?.id}
            onClick={() => s.id !== current?.id && void switchAscension(main.id, s.id)}
            className={`flex items-center gap-2 rounded-xl border p-2 text-left text-sm disabled:opacity-50 ${s.id === current?.id ? "border-accent bg-accent-soft font-medium" : "border-line hover:border-muted"}`}
          >
            <FaceThumb grid={s} sheetUrl={s.sheetUrl} cell={resolveCell(s, "neutral")} className="size-11 shrink-0 rounded-lg bg-canvas" />
            <span className="min-w-0 truncate">{s.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CastManager() {
  const session = usePlay((s) => s.session);
  const characters = usePlay((s) => s.characters);
  const setCast = usePlay((s) => s.setCast);
  const switchAscension = usePlay((s) => s.switchAscension);
  const bonds = usePlay((s) => s.bonds);
  const all = Object.values(characters).sort((a, b) => a.name.localeCompare(b.name));

  const toggle = (id: string, on: boolean) =>
    setCast(
      on
        ? [...session.cast, { characterId: id, spriteSetId: null }]
        : session.cast.filter((c) => c.characterId !== id),
    );
  const setSprite = (id: string, spriteSetId: string | null) => void switchAscension(id, spriteSetId);

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
              <span className="text-xs text-muted">Bond Lv {bondLevel(bonds[c.id] ?? 0)}</span>
              {isMain && <span className="text-sm text-muted">main</span>}
            </label>
            {entry && !isMain && c.spriteSets.length > 1 && (
              <select
                className="field w-auto text-sm"
                value={entry.spriteSetId ?? ""}
                onChange={(e) => setSprite(c.id, e.target.value || null)}
                aria-label={`${c.name} ascension`}
              >
                <option value="">Default ascension</option>
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

function MemoryField(props: {
  title: string;
  hint: string;
  placeholder: string;
  value: string;
  maxLength: number;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(props.value);
  return (
    <section>
      <h3 className="font-title text-xl font-semibold">{props.title}</h3>
      <p className="mb-3 mt-1 text-sm text-muted">{props.hint}</p>
      <textarea
        className="field min-h-28 text-sm"
        value={draft}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className="min-h-10 rounded-lg border border-line bg-raised px-4 text-sm disabled:opacity-40"
          disabled={draft === props.value}
          onClick={() => props.onSave(draft.trim())}
        >
          Save
        </button>
        <span className="text-sm tabular-nums text-muted">~{Math.ceil(draft.length / 3.5)} tokens</span>
      </div>
    </section>
  );
}

// A fresh start with the same setup. Nothing is lost: this story stays on the home page.
function NewStory() {
  const session = usePlay((s) => s.session);
  const main = usePlay((s) => s.characters[s.session.mainCharacterId]);
  const streaming = usePlay((s) => s.streaming);
  const setError = usePlay((s) => s.setError);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const form = main ? pickAscension(main, session.cast.find((c) => c.characterId === main.id)?.spriteSetId) : null;

  async function start() {
    setBusy(true);
    try {
      router.push(`/play/${unwrap(await restartStory(session.id))}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start a new story");
      setBusy(false);
    }
  }

  return (
    <section>
      <h3 className="font-title text-xl font-semibold">New story</h3>
      <p className="mb-3 mt-1 text-sm text-muted">
        Start over with {main?.name ?? "this character"}
        {form && main && main.spriteSets.length > 1 ? ` (${form.name})` : ""}, the same cast and mode, from the greeting. This story stays on the home page.
      </p>
      <button
        type="button"
        disabled={busy || streaming}
        onClick={() => void start()}
        className="min-h-10 rounded-lg border border-line bg-raised px-4 text-sm hover:border-muted disabled:opacity-40"
      >
        {busy ? <span className="shimmer">Starting…</span> : "Start a new story"}
      </button>
    </section>
  );
}

export function MenuPanel() {
  const session = usePlay((s) => s.session);
  const backgrounds = usePlay((s) => s.backgrounds);
  const patchSession = usePlay((s) => s.patchSession);
  const setPanel = usePlay((s) => s.setPanel);
  const setHideUi = usePlay((s) => s.setHideUi);
  const musicMuted = usePlay((s) => s.musicMuted);
  const toggleMusic = usePlay((s) => s.toggleMusic);
  const hasMusic = usePlay((s) => s.backgrounds.some((b) => b.musicUrl));
  const [title, setTitle] = useState(session.title);

  return (
    <PanelShell title="Menu">
      <div className="divide-y divide-line [&>section]:py-6 [&>section:first-child]:pt-2">
        {/* The story screen's other controls. With FGO frames the top bar shows only Auto, Skip and Menu. */}
        <section className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={() => setPanel("scene")}>
            Scene
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setPanel("log")}>
            Log
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setPanel("saves")}>
            Save or load
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setPanel(null);
              setHideUi(true);
            }}
          >
            Hide the interface
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setPanel("help")}>
            Controls
          </button>
          {hasMusic && (
            <button type="button" className="btn btn-outline" aria-pressed={!musicMuted} onClick={toggleMusic} title="V">
              {musicMuted ? "Music on" : "Music off"}
            </button>
          )}
        </section>

        <AscensionPicker />

        <NewStory />

        <MemoryField
          key={`memory:${session.memory}`}
          title="Story memory"
          hint="Your own notes, sent with every message and never summarized away. Keep them short: facts, not scenes."
          placeholder={"BB knows Senpai hates coffee.\nThey promised to watch the sunrise together."}
          value={session.memory}
          maxLength={4000}
          onSave={(memory) => patchSession({ memory })}
        />

        {session.mode === "narrative" && (
          <section>
            <h3 className="font-title text-xl font-semibold">Cast</h3>
            <p className="mb-2 mt-1 text-sm text-muted">Characters the AI may bring on stage. Their definitions are sent with every message.</p>
            <CastManager />
          </section>
        )}

        <section>
          <h3 className="mb-3 font-title text-xl font-semibold">Title</h3>
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
          <h3 className="mb-3 font-title text-xl font-semibold">Mode</h3>
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
          <h3 className="mb-3 font-title text-xl font-semibold">Starting background</h3>
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

        <MemoryField
          key={`summary:${session.summary}`}
          title="Story so far"
          hint="Written automatically when the story gets long, to save tokens. You can correct it."
          placeholder="Nothing summarized yet."
          value={session.summary}
          maxLength={8000}
          onSave={(summary) => patchSession({ summary })}
        />

        <section className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href={`/characters/${session.mainCharacterId}`} className="inline-flex min-h-10 items-center underline underline-offset-4">
            Edit the main character
          </Link>
        </section>
      </div>
    </PanelShell>
  );
}
