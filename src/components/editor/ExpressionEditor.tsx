"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { saveExpressions } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import type { CharacterView } from "@/lib/types";
import { DEFAULT_EXPRESSIONS } from "@/lib/expressions";

interface Row {
  id?: string;
  key: string;
  label: string;
  description: string;
}

export function ExpressionEditor({ character }: { character: CharacterView }) {
  const [rows, setRows] = useState<Row[]>(() => character.expressions.map((e) => ({ ...e })));
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAsync();

  // The standard list (smile, laugh, pout, crying…) minus what this character already has.
  const missing = DEFAULT_EXPRESSIONS.filter((d) => !rows.some((r) => r.key === d.key));

  const update = (i: number, patch: Partial<Row>) => {
    setSaved(false);
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  return (
    <div className="max-w-4xl space-y-8">
      <p className="max-w-2xl text-muted">
        The AI picks an expression id for every line. The description tells it when to use it, for example
        <span className="text-ink"> smirk — teasing, pleased with herself</span>. Pick a face for each one in Ascensions → Sprite sheet. Only expressions with a face are offered to the AI.
      </p>
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.id ?? `new-${i}`} className="card grid gap-3 p-3 sm:grid-cols-[10rem_10rem_1fr_auto]">
            <input
              className="field font-mono text-sm"
              value={r.key}
              disabled={r.key === "neutral" && !!r.id}
              placeholder="id (smirk)"
              onChange={(e) => update(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_") })}
              aria-label="Expression id"
            />
            <input className="field text-sm" value={r.label} placeholder="Label" onChange={(e) => update(i, { label: e.target.value })} aria-label="Label" />
            <input
              className="field text-sm"
              value={r.description}
              placeholder="When to use it"
              onChange={(e) => update(i, { description: e.target.value })}
              aria-label="Description"
            />
            <Button
              variant="danger"
              disabled={r.key === "neutral"}
              onClick={() => {
                setSaved(false);
                setRows((rs) => rs.filter((_, j) => j !== i));
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Button onClick={() => setRows((rs) => [...rs, { key: "", label: "", description: "" }])}>Add expression</Button>
        {missing.length > 0 && (
          <Button
            title={missing.map((e) => e.key).join(", ")}
            onClick={() => {
              setSaved(false);
              setRows((rs) => [...rs, ...missing.map((e) => ({ ...e }))]);
            }}
          >
            Add {missing.length} standard expressions
          </Button>
        )}
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              setRows(unwrap(await saveExpressions(character.id, rows)));
              setSaved(true);
            })
          }
        >
          {pending ? "Saving…" : "Save expressions"}
        </Button>
        {saved && <span className="text-sm text-muted">Saved</span>}
        <ErrorText error={error} />
      </div>
    </div>
  );
}
