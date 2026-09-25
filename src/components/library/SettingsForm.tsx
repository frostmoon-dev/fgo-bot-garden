"use client";

import { useState } from "react";
import { saveSettings } from "@/app/actions/library";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { SectionTitle } from "@/components/ui/PageHeader";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import type { SettingsView } from "@/lib/types";
import { AppearancePicker, previewAppearance } from "./AppearancePicker";

type NumKey = "temperature" | "maxTokens" | "textSpeed" | "autoSpeed" | "uiScale" | "loreScanDepth" | "contextBudget" | "keepRecent";

interface Slider {
  key: NumKey;
  title: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const GROUPS: { title: string; hint?: string; sliders: Slider[] }[] = [
  {
    title: "Reading",
    sliders: [
      { key: "textSpeed", title: "Text speed", hint: "How fast lines type out.", min: 10, max: 200, step: 5, unit: " chars/s" },
      { key: "autoSpeed", title: "Auto-advance delay", hint: "Pause after each line in Auto mode.", min: 300, max: 6000, step: 100, unit: " ms" },
      { key: "uiScale", title: "Stage text size", hint: "Size of the text on the story screen.", min: 0.8, max: 1.4, step: 0.05, unit: "×" },
    ],
  },
  {
    title: "AI replies",
    sliders: [
      { key: "temperature", title: "Temperature", hint: "Higher is more creative. Lower is more focused.", min: 0, max: 2, step: 0.05 },
      { key: "maxTokens", title: "Max reply length", hint: "Upper limit for one reply, in tokens.", min: 100, max: 4000, step: 50 },
    ],
  },
  {
    title: "Memory",
    hint: "How much of the story is sent with each message.",
    sliders: [
      { key: "loreScanDepth", title: "Lorebook scan depth", hint: "Recent messages checked for lorebook keywords.", min: 1, max: 12, step: 1 },
      { key: "contextBudget", title: "History budget", hint: "About this many tokens of history before old messages are summarized.", min: 2000, max: 32000, step: 500 },
      { key: "keepRecent", title: "Always keep", hint: "Recent messages that are never summarized.", min: 4, max: 40, step: 1 },
    ],
  },
];

export function SettingsForm({ settings }: { settings: SettingsView }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAsync();

  const update = (patch: Partial<SettingsView>) => {
    setSaved(false);
    setForm((f) => {
      const next = { ...f, ...patch };
      if ("theme" in patch || "customBg" in patch || "font" in patch) previewAppearance(next.theme, next.customBg, next.font);
      return next;
    });
  };

  return (
    <div className="max-w-3xl">
      <section>
        <SectionTitle>Appearance</SectionTitle>
        <AppearancePicker theme={form.theme} customBg={form.customBg} font={form.font} onChange={update} />
      </section>

      {GROUPS.map((g) => (
        <section key={g.title} className="mt-14 border-t border-line pt-10">
          <SectionTitle hint={g.hint}>{g.title}</SectionTitle>
          <div className="space-y-8">
            {g.sliders.map((s) => (
              <label key={s.key} className="block">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium">{s.title}</span>
                  <span className="text-sm tabular-nums text-muted">
                    {form[s.key]}
                    {s.unit ?? ""}
                  </span>
                </span>
                <span className="mt-0.5 block text-sm text-muted">{s.hint}</span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={form[s.key]}
                  onChange={(e) => update({ [s.key]: Number(e.target.value) })}
                  className="mt-3 w-full accent-[var(--accent)]"
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-14 border-t border-line pt-10">
        <SectionTitle>Developer</SectionTitle>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={form.devMode} onChange={(e) => update({ devMode: e.target.checked })} />
          <span>
            <span className="block text-sm font-medium">Dev mode</span>
            <span className="block text-sm text-muted">Shows approximate prompt tokens and parser warnings on the story screen.</span>
          </span>
        </label>
        <p className="mt-6 text-sm text-muted">
          The model, API key and base URL are server settings (LLM_MODEL, LLM_API_KEY, LLM_BASE_URL). They never reach the browser.
        </p>
      </section>

      <div className="sticky bottom-0 mt-12 flex items-center gap-4 border-t border-line bg-canvas py-4">
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
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {saved && <span className="text-sm text-muted">Saved</span>}
      </div>
      <ErrorText error={error} />
    </div>
  );
}
