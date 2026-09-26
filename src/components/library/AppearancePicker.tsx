"use client";

import { FONTS, FRAME_STYLES, schemeOf, THEMES, themeColors, themeStyle, type FontId, type FrameStyle } from "@/lib/appearance";

interface Props {
  theme: string;
  customBg: string;
  font: string;
  frameStyle: FrameStyle;
  onChange: (patch: { theme?: string; customBg?: string; font?: string; frameStyle?: FrameStyle }) => void;
}

const SAMPLE = "Welcome back, Senpai. Il1 O0 rn m";

// Applies a theme/font to the page right away so it can be judged before saving.
export function previewAppearance(theme: string, customBg: string, font: string) {
  const root = document.documentElement;
  const colors = themeColors(theme, customBg);
  root.dataset.scheme = schemeOf(colors);
  for (const [k, v] of Object.entries(themeStyle(colors))) {
    if (k.startsWith("--")) root.style.setProperty(k, v);
    else root.style.colorScheme = v;
  }
  root.dataset.font = font;
}

const FONT_VARS: Record<FontId, string> = {
  fgo: "var(--font-figtree)",
  clear: "var(--font-atkinson)",
  dyslexic: '"OpenDyslexic"',
};

// A miniature of the story text box in each style.
function FramePreview({ style }: { style: FrameStyle }) {
  return (
    <span data-frames-preview={style} className="relative block h-20 overflow-hidden rounded-lg bg-[#1d2233]">
      <span className="vn-box vn-name absolute left-3 top-2 z-10 px-3 py-0.5 font-name text-xs font-bold">Oberon</span>
      <span className="vn-box absolute inset-x-2 bottom-2 top-5 flex items-center px-4 pt-2 text-xs">Welcome back to Chaldea.</span>
    </span>
  );
}

export function AppearancePicker({ theme, customBg, font, frameStyle, onChange }: Props) {
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
        <legend className="text-sm font-medium">Story screen</legend>
        <p className="mt-0.5 text-sm text-muted">The message window, name tab and buttons while you play.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.entries(FRAME_STYLES) as [FrameStyle, (typeof FRAME_STYLES)[FrameStyle]][]).map(([id, s]) => (
            <label
              key={id}
              className={`flex cursor-pointer flex-col rounded-xl border p-3 transition-colors ${frameStyle === id ? "border-accent bg-accent-soft" : "border-line hover:border-muted"}`}
            >
              <input type="radio" name="frameStyle" value={id} checked={frameStyle === id} onChange={() => onChange({ frameStyle: id })} className="sr-only" />
              <FramePreview style={id} />
              <span className="mt-3 px-1 font-semibold">{s.label}</span>
              <span className="mt-0.5 px-1 text-sm text-muted">{s.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Font</legend>
        <p className="mt-0.5 text-sm text-muted">The font for everything you read, including the story. Titles and character names stay in Cormorant Garamond.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.entries(FONTS) as [FontId, (typeof FONTS)[FontId]][]).map(([id, f]) => (
            <label
              key={id}
              className={`flex cursor-pointer flex-col rounded-xl border p-4 transition-colors ${font === id ? "border-accent bg-accent-soft" : "border-line hover:border-muted"}`}
            >
              <input type="radio" name="font" value={id} checked={font === id} onChange={() => onChange({ font: id })} className="sr-only" />
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {f.label}
                </span>
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
