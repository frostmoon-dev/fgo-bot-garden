// Themes and fonts. Colors follow dark-UI guidance: no pure black or pure white,
// body text at 7:1 or more, one muted accent used sparingly.

export interface ThemeColors {
  bg: string;
  fg: string;
  accent: string;
  danger: string;
}

export const THEMES = {
  night: { label: "Night", hint: "Neutral dark grey", bg: "#16181d", fg: "#e3e0d9", accent: "#d2b273", danger: "#ec8b7c" },
  chaldea: { label: "Chaldea", hint: "Deep blue-grey", bg: "#131a25", fg: "#dde3ea", accent: "#dcb56c", danger: "#ef8f80" },
  dusk: { label: "Dusk", hint: "Warm, less blue light at night", bg: "#1c1814", fg: "#e9dfd0", accent: "#d9a86a", danger: "#ee8d77" },
  paper: { label: "Paper", hint: "Light, for daytime", bg: "#f3efe7", fg: "#2b2824", accent: "#8a5a12", danger: "#b3372b" },
} satisfies Record<string, ThemeColors & { label: string; hint: string }>;

export type ThemeId = keyof typeof THEMES | "custom";

export const FONTS = {
  fgo: {
    label: "FGO",
    family: "M PLUS 1 · Shippori Mincho",
    hint: "Like the game: a clear gothic for the story text (as FGO's Skip) and a serif for names and titles (as Matisse).",
  },
  clear: { label: "Clear", family: "Atkinson Hyperlegible Next", hint: "Made by the Braille Institute. Every letter is easy to tell apart." },
  plain: { label: "Plain", family: "Inter", hint: "A neutral, compact interface font." },
  rounded: { label: "Rounded", family: "Nunito", hint: "Soft, rounded letter ends." },
  dyslexic: { label: "Dyslexic", family: "OpenDyslexic", hint: "Heavy letter bottoms and wider spacing." },
} as const;

export type FontId = keyof typeof FONTS;

// How narration and actions (yours and the characters') are set apart from spoken lines.
export const NARRATION_STYLES = {
  italic: { label: "Italic", hint: "Slanted, like *actions* in a roleplay chat." },
  plain: { label: "Plain", hint: "Upright and slightly dimmer, as in FGO." },
} as const;

export type NarrationStyle = keyof typeof NARRATION_STYLES;

export function isThemeId(value: string): value is ThemeId {
  return value === "custom" || value in THEMES;
}

export function isFontId(value: string): value is FontId {
  return value in FONTS;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function themeColors(theme: string, customBg: string): ThemeColors {
  if (theme === "custom" && /^#[0-9a-f]{6}$/i.test(customBg)) {
    const light = luminance(customBg) > 0.35;
    const base = light ? THEMES.paper : THEMES.night;
    return { bg: customBg, fg: base.fg, accent: base.accent, danger: base.danger };
  }
  const preset = THEMES[theme as keyof typeof THEMES] ?? THEMES.night;
  return { bg: preset.bg, fg: preset.fg, accent: preset.accent, danger: preset.danger };
}

export function themeStyle(colors: ThemeColors): Record<string, string> {
  return {
    "--bg": colors.bg,
    "--fg": colors.fg,
    "--accent": colors.accent,
    "--danger": colors.danger,
    colorScheme: luminance(colors.bg) > 0.35 ? "light" : "dark",
  };
}
