"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSceneStory } from "@/app/actions/sessions";
import { completeScene } from "@/app/actions/story";
import { SectionTitle } from "@/components/ui/PageHeader";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import { pickAscension } from "@/lib/ascension";
import type { Mode } from "@/lib/parser/types";
import type { BackgroundView, CharacterView } from "@/lib/types";
import { Portrait } from "./Portrait";

// The unsent scene survives a reload or a trip to another page. It lives only in this browser.
const DRAFT_KEY = "scene-draft";

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveDraft(text: string) {
  try {
    if (text) localStorage.setItem(DRAFT_KEY, text);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Private windows can block storage; the draft then lasts until the page closes.
  }
}

interface Chosen {
  characterId: string;
  spriteSetId: string | null;
}

export function SceneWriter({
  characters,
  backgrounds,
  userName,
}: {
  characters: CharacterView[];
  backgrounds: BackgroundView[];
  userName: string;
}) {
  const router = useRouter();
  const writing = useAsync();
  const starting = useAsync();
  const [text, setText] = useState("");
  // The text before the AI finished it, so one click brings it back.
  const [before, setBefore] = useState<string | null>(null);
  const [cast, setCast] = useState<Chosen[]>([]);
  const [mainId, setMainId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("narrative");
  const [backgroundId, setBackgroundId] = useState("");

  useEffect(() => {
    // Read after the first render: the server has no localStorage, and both renders must match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(readDraft());
  }, []);

  function edit(next: string) {
    setText(next);
    saveDraft(next);
  }

  function toggle(c: CharacterView) {
    if (cast.some((x) => x.characterId === c.id)) {
      const rest = cast.filter((x) => x.characterId !== c.id);
      setCast(rest);
      if (mainId === c.id) setMainId(rest[0]?.characterId ?? null);
      return;
    }
    setCast([...cast, { characterId: c.id, spriteSetId: pickAscension(c)?.id ?? null }]);
    if (!mainId) setMainId(c.id);
  }

  function complete() {
    writing.run(async () => {
      const draft = text;
      const scene = unwrap(await completeScene({ text: draft, characterIds: cast.map((c) => c.characterId) }));
      setBefore(draft);
      edit(scene);
    });
  }

  function undo() {
    if (before === null) return;
    edit(before);
    setBefore(null);
  }

  function start() {
    if (!mainId) return;
    starting.run(async () => {
      const id = unwrap(
        await createSceneStory({ premise: text, cast, mainCharacterId: mainId, mode, backgroundId: backgroundId || null }),
      );
      saveDraft("");
      router.push(`/play/${id}`);
    });
  }

  const byId = new Map(characters.map((c) => [c.id, c]));
  const missing = !text.trim() ? "Write the scene first." : !cast.length ? "Choose at least one character." : null;
  const busy = writing.pending || starting.pending;

  return (
    <div className="space-y-12 sm:space-y-14">
      <section>
        <SectionTitle hint="Where and when it happens, who is there, what is going on. The AI keeps your words, finishes your sentences and fills in the rest.">
          The scene
        </SectionTitle>
        <label htmlFor="scene-text" className="sr-only">
          The scene
        </label>
        <textarea
          id="scene-text"
          rows={9}
          value={text}
          disabled={writing.pending}
          onChange={(e) => edit(e.target.value)}
          placeholder={`Late at night in the Chaldea canteen. ${userName} comes in for tea and finds…`}
          className={`field max-w-[70ch] leading-relaxed ${writing.pending ? "shimmer" : ""}`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={complete} disabled={busy} className="btn btn-outline">
            {writing.pending ? <span className="shimmer">Writing…</span> : text.trim() ? "Complete with AI" : "Write one with AI"}
          </button>
          {before !== null && !writing.pending && (
            <button type="button" onClick={undo} className="btn btn-quiet">
              Undo
            </button>
          )}
          <span className="text-sm text-muted">One small extra request.</span>
        </div>
        <ErrorText error={writing.error} />
      </section>

      <section>
        <SectionTitle hint="Who is in the story. The main character leads it and stays in it; the others can leave or come back later.">
          Characters
        </SectionTitle>
        {characters.length === 0 ? (
          <div className="card px-6 py-10 text-center">
            <p className="font-medium">No characters yet</p>
            <p className="mt-1 text-sm text-muted">Create one first, then come back to write their scene.</p>
            <Link href="/characters" className="btn btn-outline mt-6">
              Create a character
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {characters.map((c) => {
              const on = cast.some((x) => x.characterId === c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(c)}
                    className={`card block w-full overflow-hidden text-left ${on ? "border-accent" : "opacity-75 hover:opacity-100"}`}
                  >
                    <Portrait character={c} className="aspect-square w-full" />
                    <span className="flex min-h-10 items-center gap-1.5 px-2 py-1.5 text-sm">
                      <span aria-hidden className={`w-3 shrink-0 text-accent ${on ? "" : "invisible"}`}>
                        ✓
                      </span>
                      <span className="truncate font-name">{c.name}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {cast.length > 0 && (
          <ul className="mt-6 divide-y divide-line rounded-xl border border-line">
            {cast.map((x) => {
              const c = byId.get(x.characterId);
              if (!c) return null;
              return (
                <li key={x.characterId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate font-name">{c.name}</span>
                  {c.spriteSets.length > 1 && (
                    <label className="flex items-center gap-2 text-sm text-muted">
                      Ascension
                      <select
                        className="field w-auto py-1.5"
                        value={x.spriteSetId ?? ""}
                        onChange={(e) =>
                          setCast(cast.map((y) => (y.characterId === x.characterId ? { ...y, spriteSetId: e.target.value || null } : y)))
                        }
                      >
                        {c.spriteSets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="flex min-h-10 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="main-character"
                      checked={mainId === x.characterId}
                      onChange={() => setMainId(x.characterId)}
                      className="size-4 accent-[var(--accent)]"
                    />
                    Main character
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>How it plays</SectionTitle>
        <div className="grid max-w-2xl gap-2 sm:grid-cols-2">
          {(
            [
              ["narrative", "Narrative", "Narration, scene changes, several characters."],
              ["dialogue", "Dialogue", "Only the main character talks. No narration."],
            ] as [Mode, string, string][]
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-xl border p-4 text-left ${mode === value ? "border-accent bg-accent-soft" : "border-line hover:border-muted"}`}
            >
              <span className="block font-medium">{label}</span>
              <span className="mt-1 block text-sm text-muted">{hint}</span>
            </button>
          ))}
        </div>
        <label className="mt-6 block max-w-sm">
          <span className="block text-sm font-medium">Starting background</span>
          <select className="field mt-2" value={backgroundId} onChange={(e) => setBackgroundId(e.target.value)}>
            <option value="">The main character&apos;s own</option>
            {backgrounds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label || b.key}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="border-t border-line pt-6">
        <ErrorText error={starting.error} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={start} disabled={busy || !!missing} className="btn btn-primary">
            {starting.pending ? <span className="shimmer">Setting the scene…</span> : "Start the story"}
          </button>
          <span className="text-sm text-muted">{missing ?? "The first reply opens the story from your scene."}</span>
        </div>
      </div>
    </div>
  );
}
