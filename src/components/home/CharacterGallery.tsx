"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSession } from "@/app/actions/sessions";
import { FaceThumb } from "@/components/sprite/SpriteView";
import { resolveCell } from "@/components/sprite/sheet";
import { ColorDot } from "@/components/ui/ColorDot";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import { resolveProfile } from "@/lib/ascension";
import { bondLevel, bondProgress } from "@/lib/bond";
import type { CharacterView } from "@/lib/types";
import { Portrait } from "./Portrait";

function BondBadge({ points }: { points: number }) {
  const level = bondLevel(points);
  return (
    <span className="flex items-center gap-2 text-xs text-muted" title={`${points} bond points`}>
      <span className="text-accent">♥</span>
      Bond Lv {level}
      <span className="h-1 w-12 overflow-hidden rounded-full bg-raised">
        <span className="block h-full bg-accent" style={{ width: `${Math.round(bondProgress(points) * 100)}%` }} />
      </span>
    </span>
  );
}

// Pick which ascension a new story starts with. Each has its own greeting and opening scene.
function AscensionDialog({
  character,
  pending,
  onStart,
  onClose,
}: {
  character: CharacterView;
  pending: boolean;
  onStart: (spriteSetId: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Start a story with ${character.name}`}
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-canvas p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-title text-2xl font-semibold">Start a story with {character.name}</h2>
            <p className="mt-1 text-sm text-muted">Choose an ascension. You can switch later in the story&apos;s Menu.</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg px-3 text-sm text-muted hover:bg-raised hover:text-ink">
            Close
          </button>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {character.spriteSets.map((s) => {
            const profile = resolveProfile(character, s);
            const blurb = profile.scenario || profile.description;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={pending}
                  autoFocus={s.id === character.defaultSpriteSetId}
                  onClick={() => onStart(s.id)}
                  className="card flex h-full w-full gap-3 p-3 text-left hover:border-accent focus-visible:border-accent disabled:opacity-50"
                >
                  <FaceThumb grid={s} sheetUrl={s.sheetUrl} cell={resolveCell(s, "neutral")} className="size-20 shrink-0 rounded-lg bg-raised" />
                  <span className="min-w-0">
                    <span className="block font-semibold">{s.name}</span>
                    <span className="mt-1 line-clamp-3 block text-sm text-muted">{blurb || "No scenario written yet."}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function CharacterGallery({ characters, bonds }: { characters: CharacterView[]; bonds: Record<string, number> }) {
  const router = useRouter();
  const { pending, error, run } = useAsync();
  const [choosing, setChoosing] = useState<CharacterView | null>(null);

  function start(id: string, spriteSetId: string | null = null) {
    run(async () => {
      const sessionId = unwrap(await createSession(id, spriteSetId));
      router.push(`/play/${sessionId}`);
    });
  }

  const begin = (c: CharacterView) => (c.spriteSets.length > 1 ? setChoosing(c) : start(c.id));

  if (!characters.length) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="font-medium">No characters yet</p>
        <p className="mt-1 text-sm text-muted">Create one and give it an FGO sprite sheet. It starts with a full list of expressions.</p>
        <Link href="/characters" className="btn btn-primary mt-6">
          Create a character
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ErrorText error={error} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {characters.map((c) => (
          <li key={c.id} className="card group overflow-hidden">
            <button
              type="button"
              disabled={pending}
              onClick={() => begin(c)}
              className="block w-full text-left disabled:opacity-60"
              aria-label={`Start a new story with ${c.name}`}
            >
              <Portrait character={c} className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.03]" />
            </button>
            <div className="p-3 sm:p-4">
              <p className="flex min-w-0 items-center gap-2 font-name text-lg">
                <ColorDot color={c.color} />
                <span className="truncate">{c.name}</span>
              </p>
              <div className="mt-1.5">
                <BondBadge points={bonds[c.id] ?? 0} />
              </div>
              <p className="mt-2 line-clamp-2 h-[2.75em] text-sm leading-snug text-muted">{c.description || "No description yet."}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1 sm:mt-4">
                <button type="button" disabled={pending} onClick={() => begin(c)} className="btn btn-outline flex-1 px-3">
                  Start
                </button>
                <Link href={`/characters/${c.id}`} className="btn btn-quiet px-3">
                  Edit
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {choosing && (
        <AscensionDialog
          character={choosing}
          pending={pending}
          onClose={() => setChoosing(null)}
          onStart={(spriteSetId) => start(choosing.id, spriteSetId)}
        />
      )}
    </div>
  );
}
