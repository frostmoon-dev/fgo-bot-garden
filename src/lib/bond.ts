import type { ScriptLine } from "@/lib/parser/types";

// FGO-style bond: levels 1 to 10, earned one point per exchange in which the character speaks.
// Points needed for each level.
const THRESHOLDS = [0, 5, 15, 30, 50, 75, 105, 140, 180, 225];
export const MAX_BOND_LEVEL = THRESHOLDS.length;

const TIERS = [
  "just met: polite, a little guarded",
  "acquainted: curious about {{user}}",
  "familiar: relaxed, jokes more",
  "friendly: glad to see {{user}}",
  "trusted: open, teases freely",
  "close: shares personal thoughts",
  "very close: protective and honest",
  "devoted: lets real vulnerability show",
  "deep bond: would go far for {{user}}",
  "unbreakable: {{user}} is irreplaceable to them",
];

// The points a level starts at, for setting the bond by hand.
export function pointsForLevel(level: number): number {
  return THRESHOLDS[Math.min(Math.max(Math.round(level), 1), MAX_BOND_LEVEL) - 1];
}

export function bondLevel(points: number): number {
  return THRESHOLDS.filter((t) => points >= t).length;
}

// Progress toward the next level, 0 to 1 (1 at the max level).
export function bondProgress(points: number): number {
  const level = bondLevel(points);
  if (level >= MAX_BOND_LEVEL) return 1;
  const from = THRESHOLDS[level - 1];
  return (points - from) / (THRESHOLDS[level] - from);
}

export function bondPrompt(points: number): string {
  const level = bondLevel(points);
  return `Lv ${level}/${MAX_BOND_LEVEL} (${TIERS[level - 1]}). Let it color how warm and open they are, within their personality.`;
}

// Characters who spoke in a reply; each earns one point when the reply answers the user.
export function bondSpeakers(lines: ScriptLine[]): string[] {
  const ids = lines.flatMap((l) => (l.type === "dialogue" && l.characterId && l.text ? [l.characterId] : []));
  return [...new Set(ids)];
}
