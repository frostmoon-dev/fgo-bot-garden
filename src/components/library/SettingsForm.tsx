"use client";

import { useState } from "react";
import { reloadData, saveSettings } from "@/app/actions/library";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextArea } from "@/components/ui/Field";
import { SectionTitle } from "@/components/ui/PageHeader";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import { NARRATION_STYLES, type NarrationStyle } from "@/lib/appearance";
import type { SettingsView } from "@/lib/types";
import { AppearancePicker, previewAppearance } from "./AppearancePicker";

type NumKey =
  | "temperature"
  | "maxTokens"
  | "topP"
  | "frequencyPenalty"
  | "presencePenalty"
  | "textSpeed"
  | "autoSpeed"
  | "uiScale"
  | "windowOpacity"
  | "musicVolume"
  | "loreScanDepth"
  | "contextBudget"
  | "keepRecent";

interface Slider {
  key: NumKey;
  title: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  // Shown as a percentage (0.8 -> 80%).
  percent?: boolean;
}

const READING: Slider[] = [
  { key: "textSpeed", title: "Text speed", hint: "How fast lines type out.", min: 10, max: 200, step: 5, unit: " chars/s" },
  { key: "autoSpeed", title: "Auto-advance delay", hint: "Pause after each line in Auto mode.", min: 300, max: 6000, step: 100, unit: " ms" },
  { key: "uiScale", title: "Stage text size", hint: "Size of the text on the story screen.", min: 0.8, max: 1.4, step: 0.05, unit: "×" },
  {
    key: "windowOpacity",
    title: "Window opacity",
    hint: "How solid the message window is (FGO frames). Lower lets the scene show through, as in the game; the text keeps a shadow so it stays readable.",
    min: 0.4,
    max: 1,
    step: 0.05,
    percent: true,
  },
  {
    key: "musicVolume",
    title: "Music volume",
    hint: "Background music set on the Backgrounds page. 0% turns it off; V mutes it in a story.",
    min: 0,
    max: 1,
    step: 0.05,
    percent: true,
  },
];

const SAMPLING: Slider[] = [
  { key: "temperature", title: "Temperature", hint: "Higher is more creative. Lower is more focused and keeps weaker models on format.", min: 0, max: 2, step: 0.05 },
  { key: "maxTokens", title: "Max reply length", hint: "Upper limit for one reply, in tokens. Also kept free in the context.", min: 100, max: 4000, step: 50 },
  { key: "topP", title: "Top P", hint: "1 turns it off. Around 0.9 cuts unlikely words.", min: 0.5, max: 1, step: 0.01 },
  { key: "frequencyPenalty", title: "Frequency penalty", hint: "Above 0 discourages repeating the same words. 0 turns it off.", min: 0, max: 1.5, step: 0.05 },
  { key: "presencePenalty", title: "Presence penalty", hint: "Above 0 nudges the story toward new topics. 0 turns it off.", min: 0, max: 1.5, step: 0.05 },
];

const MEMORY: Slider[] = [
  { key: "contextBudget", title: "History before summarizing", hint: "When the story history passes about this many tokens, older messages are summarized in the background.", min: 1000, max: 64000, step: 500 },
  { key: "keepRecent", title: "Always keep", hint: "Recent messages that are never summarized.", min: 4, max: 40, step: 1 },
  { key: "loreScanDepth", title: "Lorebook scan depth", hint: "Recent messages checked for lorebook keywords.", min: 1, max: 12, step: 1 },
];

const CONTEXT_SIZES = [4096, 8192, 16384, 32768, 65536, 131072, 200000, 1000000];

const PRESETS: { title: string; hint: string; values: Partial<SettingsView> }[] = [
  {
    title: "Small or local model",
    hint: "8K context, compact prompt, strict format.",
    values: { promptProfile: "compact", contextSize: 8192, maxTokens: 700, contextBudget: 3000, keepRecent: 8, temperature: 0.8, exampleMode: "auto", formatReminder: true, replyLength: "scene" },
  },
  {
    title: "Standard",
    hint: "32K context. A good default for most APIs.",
    values: { promptProfile: "balanced", contextSize: 32768, maxTokens: 1000, contextBudget: 8000, keepRecent: 12, temperature: 0.9, exampleMode: "auto", formatReminder: true, replyLength: "scene" },
  },
  {
    title: "Large context",
    hint: "128K context. Summarizes much later.",
    values: { promptProfile: "balanced", contextSize: 131072, maxTokens: 1500, contextBudget: 24000, keepRecent: 20, temperature: 0.9, exampleMode: "auto", formatReminder: true, replyLength: "scene" },
  },
];

function kLabel(n: number) {
  return n >= 1000000 ? `${n / 1000000}M` : `${Math.round(n / 1024)}K`;
}

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map(([id, label, hint]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`rounded-xl border p-4 text-left ${value === id ? "border-accent bg-accent-soft" : "border-line hover:border-muted"}`}
        >
          <span className="block font-medium">{label}</span>
          <span className="mt-1 block text-sm text-muted">{hint}</span>
        </button>
      ))}
    </div>
  );
}

// Picks up edits made outside the app without waiting for the cache to refresh (up to 10 minutes).
function ReloadData() {
  const [done, setDone] = useState(false);
  const { pending, error, run } = useAsync();
  return (
    <div className="mt-8">
      <span className="block text-sm font-medium">Reload data</span>
      <span className="block text-sm text-muted">
        Characters, backgrounds, lorebook and settings are cached for speed. After editing them outside the app (for example in the Supabase
        dashboard), reload to see the changes now instead of within 10 minutes.
      </span>
      <div className="mt-3 flex items-center gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            run(async () => {
              unwrap(await reloadData());
              setDone(true);
            })
          }
        >
          {pending ? "Reloading…" : "Reload data"}
        </Button>
        {done && <span className="text-sm text-muted">Reloaded.</span>}
      </div>
      <ErrorText error={error} />
    </div>
  );
}

function Toggle({ title, hint, checked, onChange }: { title: string; hint: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );
}

export function SettingsForm({ settings }: { settings: SettingsView }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAsync();

  const update = (patch: Partial<SettingsView>) => {
    setSaved(false);
    setForm((f) => {
      const next = { ...f, ...patch };
      if ("theme" in patch || "customBg" in patch || "font" in patch) previewAppearance(next.theme, next.customBg, next.font);
      if (patch.narrationStyle) document.documentElement.dataset.narration = patch.narrationStyle;
      if (patch.frameStyle) document.documentElement.dataset.frames = patch.frameStyle;
      return next;
    });
  };

  const sliders = (list: Slider[]) => (
    <div className="space-y-8">
      {list.map((s) => (
        <label key={s.key} className="block">
          <span className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-medium">{s.title}</span>
            <span className="text-sm tabular-nums text-muted">
              {s.percent ? `${Math.round(form[s.key] * 100)}%` : form[s.key]}
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
  );

  const sizes = CONTEXT_SIZES.includes(form.contextSize) ? CONTEXT_SIZES : [...CONTEXT_SIZES, form.contextSize].sort((a, b) => a - b);

  return (
    <div className="max-w-3xl">
      <section>
        <SectionTitle>Appearance</SectionTitle>
        <AppearancePicker theme={form.theme} customBg={form.customBg} font={form.font} frameStyle={form.frameStyle} onChange={update} />
      </section>

      <section className="mt-14 border-t border-line pt-10">
        <SectionTitle>Reading</SectionTitle>
        <fieldset className="mb-10">
          <legend className="text-sm font-medium">Narration and actions</legend>
          <p className="mt-0.5 mb-3 text-sm text-muted">How descriptions and actions look next to spoken lines, yours and the characters&apos;.</p>
          <Choice<NarrationStyle>
            value={form.narrationStyle}
            options={(Object.entries(NARRATION_STYLES) as [NarrationStyle, (typeof NARRATION_STYLES)[NarrationStyle]][]).map(([id, s]) => [id, s.label, s.hint])}
            onChange={(narrationStyle) => update({ narrationStyle })}
          />
        </fieldset>
        {sliders(READING)}
      </section>

      <section className="mt-14 border-t border-line pt-10">
        <SectionTitle hint="Tune the prompt for the model you connected (the Connection page). Start from a preset, then adjust.">AI model</SectionTitle>
        <div className="space-y-10">
          <div>
            <span className="block text-sm font-medium">Presets</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {PRESETS.map((p) => (
                <button key={p.title} type="button" onClick={() => update(p.values)} className="rounded-xl border border-line p-4 text-left hover:border-muted">
                  <span className="block font-medium">{p.title}</span>
                  <span className="mt-1 block text-sm text-muted">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <Label title="Context size" hint="How many tokens the model accepts. Older messages are left out so the prompt always fits.">
            <select className="field w-auto" value={form.contextSize} onChange={(e) => update({ contextSize: Number(e.target.value) })}>
              {sizes.map((n) => (
                <option key={n} value={n}>
                  {kLabel(n)} tokens
                </option>
              ))}
            </select>
          </Label>

          <div>
            <span className="block text-sm font-medium">Prompt style</span>
            <span className="mb-2 mt-0.5 block text-sm text-muted">Pick Strict or Compact if the AI mixes narration into dialogue.</span>
            <Choice
              value={form.promptProfile}
              onChange={(promptProfile) => update({ promptProfile })}
              options={[
                ["balanced", "Balanced", "Full character details. For capable models."],
                ["strict", "Strict format", "Balanced plus extra format rules."],
                ["compact", "Compact", "Fewer tokens and strict format. For small or local models."],
              ]}
            />
          </div>

          <div>
            <span className="block text-sm font-medium">Reply length</span>
            <span className="mb-2 mt-0.5 block text-sm text-muted">How many lines the characters write before it is your turn.</span>
            <Choice
              value={form.replyLength}
              onChange={(replyLength) => update({ replyLength })}
              options={[
                ["short", "Short", "3 to 5 lines. Quick back-and-forth."],
                ["scene", "FGO scene", "8 to 14 lines, like an FGO story: several lines in a row, reactions, narration."],
                ["long", "Long", "14 to 22 lines. Needs a higher max reply length."],
              ]}
            />
          </div>

          <div>
            <span className="block text-sm font-medium">Example dialogue</span>
            <span className="mb-2 mt-0.5 block text-sm text-muted">Examples teach a character&apos;s voice but cost tokens on every message.</span>
            <Choice
              value={form.exampleMode}
              onChange={(exampleMode) => update({ exampleMode })}
              options={[
                ["auto", "Until the story starts", "Sent for the first 3 replies, then the story itself shows the voice."],
                ["always", "Always", "Best for keeping a voice; costs the most."],
                ["never", "Never", "Cheapest."],
              ]}
            />
          </div>

          <div>
            <span className="block text-sm font-medium">World info placement</span>
            <span className="mb-2 mt-0.5 block text-sm text-muted">Where lorebook entries and the format reminder go.</span>
            <Choice
              value={form.memoryPlacement}
              onChange={(memoryPlacement) => update({ memoryPlacement })}
              options={[
                ["end", "Near the latest message", "Followed best, and the rest of the prompt can be cached by the provider (cheaper, faster)."],
                ["top", "In the system prompt", "For APIs that reject system messages mid-chat. Changes the start of the prompt every reply, so the provider can't reuse its cache."],
              ]}
            />
          </div>

          <div className="space-y-4">
            <Toggle
              title="Format reminder"
              hint="Repeats the line format right before each reply. Helps models that drift into *actions* or prose."
              checked={form.formatReminder}
              onChange={(formatReminder) => update({ formatReminder })}
            />
            <Toggle
              title="Scene box"
              hint="Updates the place, time, weather and who is present after each reply. It lights the stage and keeps details consistent. One small extra request per reply."
              checked={form.sceneTracker}
              onChange={(sceneTracker) => update({ sceneTracker })}
            />
            <Toggle
              title="Choices after every reply"
              hint="Shows three things you could do next, like a VN choice menu. One small extra request per reply. Off: use the Choices button when you want them."
              checked={form.autoChoices}
              onChange={(autoChoices) => update({ autoChoices })}
            />
            <Toggle
              title="Inner thoughts"
              hint="Characters may now and then show what they privately think but don't say, in a quieter style, marked with their name. Nobody in the story hears it. Some models overuse it; turn it off if they do."
              checked={form.innerThoughts}
              onChange={(innerThoughts) => update({ innerThoughts })}
            />
            <Toggle
              title="Stop at my name"
              hint="Stops the reply when the AI starts writing a line for your persona."
              checked={form.stopAtUser}
              onChange={(stopAtUser) => update({ stopAtUser })}
            />
          </div>

          {sliders(SAMPLING)}

          <Label title="Extra instructions" hint="Added to every prompt, like JanitorAI's custom prompt. Example: Keep replies under 6 lines.">
            <TextArea value={form.customPrompt} maxLength={8000} onChange={(e) => update({ customPrompt: e.target.value })} />
          </Label>
        </div>
      </section>

      <section className="mt-14 border-t border-line pt-10">
        <SectionTitle hint="Pin messages in the Log and write Story memory in the story Menu. Both stay in every prompt.">Memory</SectionTitle>
        <div className="mb-8">
          <Toggle
            title="Characters remember you across stories"
            hint="Every six exchanges, each character who spoke notes what they learned about you, and brings it into every later story. One small extra request per character, every six exchanges. See or edit it in each character's Memories tab."
            checked={form.characterMemory}
            onChange={(characterMemory) => update({ characterMemory })}
          />
        </div>
        {sliders(MEMORY)}
      </section>

      <section className="mt-14 border-t border-line pt-10">
        <SectionTitle>Developer</SectionTitle>
        <Toggle
          title="Dev mode"
          hint="Shows prompt tokens (system, memory, history, notes) and parser repairs on the story screen."
          checked={form.devMode}
          onChange={(devMode) => update({ devMode })}
        />
        <ReloadData />
        <p className="mt-6 text-sm text-muted">
          The provider, model and API key are on the{" "}
          <a href="/connection" className="text-accent hover:underline">
            Connection
          </a>{" "}
          page. The key stays on the server.
        </p>
      </section>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 lg:bottom-0 mt-12 flex items-center gap-4 border-t border-line bg-canvas py-4">
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
