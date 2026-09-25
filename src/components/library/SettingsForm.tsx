"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { saveSettings } from "@/app/actions/library";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import type { SettingsView } from "@/lib/types";

type NumKey = Exclude<keyof SettingsView, "devMode">;

const SLIDERS: { key: NumKey; title: string; hint: string; min: number; max: number; step: number; unit?: string }[] = [
  { key: "temperature", title: "Temperature", hint: "Higher = more creative, lower = more focused.", min: 0, max: 2, step: 0.05 },
  { key: "maxTokens", title: "Max tokens", hint: "Longest reply the AI may write.", min: 100, max: 4000, step: 50 },
  { key: "textSpeed", title: "Text speed", hint: "Typewriter speed.", min: 10, max: 200, step: 5, unit: " chars/s" },
  { key: "autoSpeed", title: "Auto-advance delay", hint: "Wait after a line finishes in Auto mode.", min: 300, max: 6000, step: 100, unit: " ms" },
  { key: "uiScale", title: "UI scale", hint: "Text size on the stage.", min: 0.8, max: 1.4, step: 0.05, unit: "×" },
  { key: "loreScanDepth", title: "Lorebook scan depth", hint: "How many recent messages are checked for keywords.", min: 1, max: 12, step: 1 },
  { key: "contextBudget", title: "History budget", hint: "Approximate tokens of history before old messages are summarized.", min: 2000, max: 32000, step: 500 },
  { key: "keepRecent", title: "Keep recent", hint: "Messages always sent in full, never summarized.", min: 4, max: 40, step: 1 },
];

export function SettingsForm({ settings }: { settings: SettingsView }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAsync();

  return (
    <div className="panel max-w-2xl space-y-5 rounded-lg p-4">
      {SLIDERS.map((s) => (
        <label key={s.key} className="block space-y-1">
          <span className="flex justify-between text-sm">
            <span>{s.title}</span>
            <span className="font-mono text-gold">
              {form[s.key]}
              {s.unit ?? ""}
            </span>
          </span>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={form[s.key]}
            onChange={(e) => {
              setSaved(false);
              setForm((f) => ({ ...f, [s.key]: Number(e.target.value) }));
            }}
            className="w-full accent-[#d8b56a]"
          />
          <span className="block text-xs text-ink-dim">{s.hint}</span>
        </label>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.devMode}
          onChange={(e) => {
            setSaved(false);
            setForm((f) => ({ ...f, devMode: e.target.checked }));
          }}
        />
        Dev mode (show token usage and parser warnings on the stage)
      </label>
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              unwrap(await saveSettings(form));
              setSaved(true);
            })
          }
        >
          Save settings
        </Button>
        {saved && <span className="text-sm text-ink-dim">Saved.</span>}
        <ErrorText error={error} />
      </div>
    </div>
  );
}
