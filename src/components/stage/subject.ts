// Who a line of narration is about: the on-stage character it names first ("BB giggles, leaning in…"),
// so they can step in front of the others while it shows. Null when it names nobody on stage.
export function narrationSubject(text: string, onStage: { id: string; name: string; aliases: string[] }[]): string | null {
  let best: { id: string; at: number } | null = null;
  for (const c of onStage) {
    for (const n of [c.name, ...c.aliases]) {
      const name = n.trim();
      if (!name) continue;
      const m = new RegExp(`(?<![\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu").exec(text);
      if (m && (!best || m.index < best.at)) best = { id: c.id, at: m.index };
    }
  }
  return best?.id ?? null;
}
