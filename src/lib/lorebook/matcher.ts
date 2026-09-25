import type { LoreEntry } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function keywordPattern(keyword: string): RegExp | null {
  const k = keyword.trim();
  if (!k) return null;
  // Whole-word match, so "art" does not trigger on "Arthur".
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(k)}(?![\\p{L}\\p{N}_])`, "iu");
}

export function matchLore(entries: LoreEntry[], texts: string[]): LoreEntry[] {
  const haystack = texts.join("\n");
  return entries.filter(
    (entry) =>
      entry.enabled &&
      entry.keywords.some((k) => {
        const re = keywordPattern(k);
        return re ? re.test(haystack) : false;
      }),
  );
}

export async function getTriggeredLore(
  provider: { listEnabled(): Promise<LoreEntry[]> },
  texts: string[],
): Promise<LoreEntry[]> {
  return matchLore(await provider.listEnabled(), texts);
}
