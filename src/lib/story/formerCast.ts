// Characters taken out of a story's cast still have lines in its history, and the model keeps writing them
// in unless it is told they are gone. These helpers find them and take them out of the scene box.

export interface NamedCharacter {
  id: string;
  name: string;
  aliases: string[];
}

function mentions(text: string, names: string[]): boolean {
  return names.some((n) => n.trim() && new RegExp(`(?<![\\p{L}\\p{N}])${n.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu").test(text));
}

// Characters who speak in the history ([Name|…] tags) but are no longer in the cast.
export function formerCast(contents: string[], all: NamedCharacter[], castIds: Set<string>): NamedCharacter[] {
  const tags = new Set<string>();
  for (const text of contents) for (const m of text.matchAll(/\[([^\]|,:]{1,40}?)\s*[|\]]/g)) tags.add(m[1].trim().toLowerCase());
  return all.filter((c) => !castIds.has(c.id) && [c.name, ...c.aliases].some((n) => tags.has(n.trim().toLowerCase())));
}

// Removes the given characters from the scene box's "Present:" line.
export function withoutPresent(scene: string, gone: NamedCharacter[]): string {
  if (!gone.length) return scene;
  return scene
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^(\s*Present\s*:\s*)(.*)$/i);
      if (!m) return line;
      const kept = m[2]
        .split(/\s*,\s*|\s+and\s+/i)
        .filter((part) => part && !gone.some((c) => mentions(part, [c.name, ...c.aliases])));
      return `${m[1]}${kept.join(", ")}`;
    })
    .join("\n");
}

// Scene box "Present:" names that are cast members, or null when the line is missing.
// A part like "Oberon (has left)" does not count as present.
export function presentIds(scene: string, cast: NamedCharacter[]): Set<string> | null {
  const line = scene.split(/\r?\n/).find((l) => /^\s*[-•*]?\s*Present\s*:/i.test(l.replace(/[*`]+/g, "")));
  if (!line) return null;
  const parts = line
    .replace(/[*`]+/g, "")
    .replace(/^[^:]*:/, "")
    .split(/\s*,\s*|\s+and\s+/i)
    .filter((p) => !/\b(?:left|gone|absent|away|not|no longer|asleep elsewhere)\b/i.test(p));
  return new Set(cast.filter((c) => parts.some((p) => mentions(p, [c.name, ...c.aliases]))).map((c) => c.id));
}
