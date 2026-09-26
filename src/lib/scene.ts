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
