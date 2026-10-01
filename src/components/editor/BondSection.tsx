"use client";

import { useState } from "react";
import { setBondLevel } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { askConfirm } from "@/components/ui/dialogs";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import { bondLevel, bondProgress, MAX_BOND_LEVEL } from "@/lib/bond";
import type { CharacterView } from "@/lib/types";

// The bond level, and setting it by hand: back to Lv 1 to start over, or any level to set the tone.
export function BondSection({ character, points, userName }: { character: CharacterView; points: number; userName: string }) {
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
    </section>
  );
}
