"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBondLevel } from "@/app/actions/characters";
import { startInterlude } from "@/app/actions/sessions";
import { Button } from "@/components/ui/Button";
import { askConfirm } from "@/components/ui/dialogs";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import { bondLevel, bondProgress, MAX_BOND_LEVEL } from "@/lib/bond";
import { INTERLUDES } from "@/lib/interlude";
import type { CharacterView } from "@/lib/types";

export interface PlayedInterlude {
  n: number;
  storyId: string;
  title: string;
}

// The bond level, and setting it by hand: back to Lv 1 to start over, or any level to set the tone.
export function BondSection({
  character,
  points,
  interludes,
  userName,
}: {
  character: CharacterView;
  points: number;
  interludes: PlayedInterlude[];
  userName: string;
}) {
  const router = useRouter();
  const [writing, setWriting] = useState<number | null>(null);
  const [current, setCurrent] = useState(points);
  const level = bondLevel(current);
  const [target, setTarget] = useState(level);
  const { pending, error, run } = useAsync();

  async function apply(to: number) {
    if (to < level) {
      const ok = await askConfirm({
        title: `Lower the bond to Lv ${to}?`,
        body: `${character.name}'s bond with ${userName} drops from Lv ${level} to Lv ${to}, and the points earned since then are lost. They will be as warm as Lv ${to} in every story. Memories stay; clear them below if they should forget too.`,
        confirmLabel: `Set to Lv ${to}`,
        danger: true,
      });
      if (!ok) return;
    }
    run(async () => {
      setCurrent(unwrap(await setBondLevel(character.id, to)));
    });
  }

  return (
    <section className="mb-12 max-w-2xl">
      <h2 className="tab-heading">Bond</h2>
      <p className="mt-2 text-sm text-muted">
        Grows by one point each time {character.name} speaks in a reply to {userName}. The level shapes how warm and open they are in every story.
      </p>
      <div className="mt-5 flex items-center gap-3">
        <span className="font-name text-lg">Lv {level}</span>
        <span className="h-1.5 w-40 overflow-hidden rounded-full bg-raised" aria-hidden>
          <span className="block h-full bg-accent" style={{ width: `${Math.round(bondProgress(current) * 100)}%` }} />
        </span>
        <span className="text-sm text-muted">{current} points</span>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Set to
          <select className="field w-auto" value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            {Array.from({ length: MAX_BOND_LEVEL }, (_, i) => i + 1).map((l) => (
              <option key={l} value={l}>
                Lv {l}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={pending || target === level} onClick={() => apply(target)}>
          {pending ? "Saving…" : "Set bond"}
        </Button>
        {level > 1 && (
          <Button variant="quiet" disabled={pending} onClick={() => apply(1)}>
            Reset to Lv 1
          </Button>
        )}
      </div>
      <ErrorText error={error} />

      <h3 className="mt-10 font-semibold">Interludes</h3>
      <p className="mt-1 text-sm text-muted">
        Private side stories that a growing bond unlocks. The AI writes each opening scene from {character.name}&apos;s definition and memories
        (one small extra request), then it plays like any story.
      </p>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
        {INTERLUDES.map((i) => {
          const played = interludes.find((p) => p.n === i.n);
          const open = level >= i.level;
          return (
            <li key={i.n} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className={`block font-medium ${open ? "" : "text-muted"}`}>Interlude {i.n}</span>
                <span className="block truncate text-sm text-muted">
                  {!open ? `Unlocks at bond Lv ${i.level}` : played ? played.title : "Ready to play"}
                </span>
              </span>
              {open && played && (
                <Link href={`/play/${played.storyId}`} className="btn btn-outline">
                  Continue
                </Link>
              )}
              {open && (
                <Button
                  variant={played ? "quiet" : "secondary"}
                  disabled={writing !== null}
                  onClick={() =>
                    run(async () => {
                      setWriting(i.n);
                      try {
                        router.push(`/play/${unwrap(await startInterlude(character.id, i.n))}`);
                      } catch (e) {
                        setWriting(null);
                        throw e;
                      }
                    })
                  }
                >
                  {writing === i.n ? <span className="shimmer">Writing…</span> : played ? "Play again" : "Play"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
