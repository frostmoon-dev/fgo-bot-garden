// The scene box: a few "Key: value" lines that describe the world around the story right now.
// Kept up to date after replies, sent with every prompt, and used to light the stage.

export const SCENE_KEYS = ["Location", "Time", "Weather", "Present", "Mood", "Situation"] as const;
export type SceneKey = (typeof SCENE_KEYS)[number];
export type SceneFields = Partial<Record<SceneKey, string>>;

export function parseScene(text: string): SceneFields {
  const out: SceneFields = {};
  for (const raw of text.split(/\r?\n/)) {
    // Models like to decorate these lines: "*Location:* BB's room*", "**Time**: Night", "- Mood: `calm`".
    const line = raw.replace(/[*`]+|__/g, "").trim();
    const m = line.match(/^[-•]?\s*([A-Za-z]+)\s*:\s*(.+)$/);
    if (!m) continue;
    const key = SCENE_KEYS.find((k) => k.toLowerCase() === m[1].toLowerCase());
    if (key && m[2].trim()) out[key] = m[2].trim();
  }
  return out;
}

// Keeps only the known keys, in order. Returns "" when nothing usable is left.
export function cleanScene(text: string): string {
  const fields = parseScene(text);
  return SCENE_KEYS.filter((k) => fields[k]).map((k) => `${k}: ${fields[k]}`).join("\n");
}

// For text the user wrote: known keys are kept, plain prose becomes the Situation line.
export function normalizeScene(text: string): string {
  const clean = cleanScene(text);
  if (clean) return clean;
  const prose = text.trim().replace(/\s+/g, " ");
  return prose ? `Situation: ${prose}` : "";
}

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export function timeOfDay(time: string | undefined): TimeOfDay | null {
  const t = (time ?? "").toLowerCase();
  if (/night|夜/.test(t)) return "night";
  if (/dusk|sunset|evening|twilight|夕/.test(t)) return "dusk";
  if (/dawn|sunrise|early morning|daybreak/.test(t)) return "dawn";
  if (/morning|noon|afternoon|day|昼|朝/.test(t)) return "day";
  return null;
}

export type Weather = "rain" | "storm" | "snow" | "fog" | "petals";

// Weather is only drawn outdoors; "indoors" or "outside the window" leaves the stage clear.
export function weatherOf(weather: string | undefined): Weather | null {
  const w = (weather ?? "").toLowerCase();
  if (!w || /indoor|inside|window|none|clear|n\/a/.test(w)) return null;
  if (/storm|thunder|lightning/.test(w)) return "storm";
  if (/snow|blizzard|flurr/.test(w)) return "snow";
  if (/rain|drizzle|shower|downpour/.test(w)) return "rain";
  if (/fog|mist|haze/.test(w)) return "fog";
  if (/petal|blossom|sakura/.test(w)) return "petals";
  return null;
}

// Small words stay lower case inside a title: "An Empty Meeting Room in Chaldea, Lit by Candles".
const MINOR_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "nor", "so", "yet",
  "as", "at", "by", "for", "from", "in", "into", "of", "off", "on", "onto", "out", "over", "to", "up", "via", "with",
]);

// Title Case for the place card. Capitals the model wrote (BB, Chaldea) are kept; small words are lowered,
// except the first and last word and the first word after a colon or dash.
export function titleCase(text: string): string {
  const parts = text.trim().split(/(\s+)/);
  const words = parts.filter((p) => p && !/^\s+$/.test(p));
  let index = 0;
  let afterBreak = true;
  return parts
    .map((part) => {
      if (!part || /^\s+$/.test(part)) return part;
      const first = index === 0 || afterBreak;
      const last = index === words.length - 1;
      index++;
      afterBreak = /[:—–]$/.test(part) || part === "-";
      // Only the letters decide: "(in" and "in," are still "in".
      const core = part.match(/[\p{L}'’-]+/u)?.[0] ?? "";
      if (!first && !last && MINOR_WORDS.has(core.toLowerCase())) return part.replace(core, core.toLowerCase());
      // Capitalise each piece of a hyphenated word ("well-lit" → "Well-Lit"), leaving the rest as written.
      return part.replace(/(^|[-(\/"“])(\p{Ll})/gu, (_, lead: string, letter: string) => lead + letter.toUpperCase());
    })
    .join("");
}
