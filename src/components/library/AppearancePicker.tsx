"use client";

import { FONTS, THEMES, themeColors, themeStyle, type FontId } from "@/lib/appearance";

interface Props {
  theme: string;
  customBg: string;
  font: string;
  onChange: (patch: { theme?: string; customBg?: string; font?: string }) => void;
}

const SAMPLE = "Welcome back, Senpai. Il1 O0 rn m";

// Applies a theme/font to the page right away so it can be judged before saving.
export function previewAppearance(theme: string, customBg: string, font: string) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(themeStyle(themeColors(theme, customBg)))) {
    if (k.startsWith("--")) root.style.setProperty(k, v);
    else root.style.colorScheme = v;
  }
  root.dataset.font = font;
}

const FONT_VARS: Record<FontId, string> = {
  clear: "var(--font-atkinson)",
  plain: "var(--font-inter)",
  rounded: "var(--font-nunito)",
  dyslexic: '"OpenDyslexic"',
};

export function AppearancePicker({ theme, customBg, font, onChange }: Props) {
  return (
    <div className="space-y-10">
      <fieldset>
        <legend className="text-sm font-medium">Color theme</legend>
        <p className="mt-0.5 text-sm text-muted">Soft greys instead of pure black and white, to reduce glare and eye strain.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(THEMES).map(([id, t]) => (
            <label
              key={id}
              className={`cursor-pointer rounded-xl border p-1 transition-colors ${theme === id ? "border-accent" : "border-line hover:border-muted"}`}
            >
              <input type="radio" name="theme" value={id} checked={theme === id} onChange={() => onChange({ theme: id })} className="sr-only" />
              <span className="block rounded-lg p-3" style={{ background: t.bg, color: t.fg }}>
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="mt-2 flex gap-1.5">
                  <span className="h-1.5 w-8 rounded-full" style={{ background: t.accent }} />
                  <span className="h-1.5 w-4 rounded-full opacity-40" style={{ background: t.fg }} />
                </span>
              </span>
              <span className="block px-2 pb-1 pt-2 text-xs text-muted">{t.hint}</span>
            </label>
          ))}
          <label
            className={`cursor-pointer rounded-xl border p-1 transition-colors ${theme === "custom" ? "border-accent" : "border-line hover:border-muted"}`}
          >
            <input type="radio" name="theme" value="custom" checked={theme === "custom"} onChange={() => onChange({ theme: "custom", customBg: customBg || "#1f2330" })} className="sr-only" />
            <span className="flex items-center justify-between rounded-lg bg-raised p-3">
              <span className="text-sm font-semibold">Custom</span>
              <input
                type="color"
                aria-label="Custom background color"
                value={customBg || "#1f2330"}
                onChange={(e) => onChange({ theme: "custom", customBg: e.target.value })}
                className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </span>
            <span className="block px-2 pb-1 pt-2 text-xs text-muted">Pick any background. Text color adapts.</span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Font</legend>
        <p className="mt-0.5 text-sm text-muted">Used everywhere, including the story text.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.entries(FONTS) as [FontId, (typeof FONTS)[FontId]][]).map(([id, f]) => (
            <label
              key={id}
              className={`flex cursor-pointer flex-col rounded-xl border p-4 transition-colors ${font === id ? "border-accent bg-accent-soft" : "border-line hover:border-muted"}`}
            >
              <input type="radio" name="font" value={id} checked={font === id} onChange={() => onChange({ font: id })} className="sr-only" />
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{f.label}</span>
                <span className="text-xs text-muted">{f.family}</span>
              </span>
              <span className="mt-2 text-lg" style={{ fontFamily: FONT_VARS[id] }}>
                {SAMPLE}
              </span>
              <span className="mt-2 text-sm text-muted">{f.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
