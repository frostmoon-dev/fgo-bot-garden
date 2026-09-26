import { closeAsterisks } from "@/lib/userInput";

export interface Choice {
  kind: "say" | "do";
  text: string;
}

// Reads "SAY: …" / "DO: …" lines. Tolerates numbering, bullets and quotes around the words.
// Roleplay models often keep roleplaying around the options ("*grins* SAY: Hey", "*DO: Leave.*"),
// so a capitalised SAY:/DO: later in a line starts an option too, and a wrapping asterisk is dropped.
export function parseChoices(text: string): Choice[] {
  const out: Choice[] = [];
  const pieces = text
    .replace(/\*\*/g, "")
    .split(/\r?\n|(?=(?<!\*)\*?\b(?:SAY|DO):)/)
    .map((raw) => raw.replace(/^\s*(?:[-•]|\d+[.)])\s*/, "").trim());
  for (const line of pieces) {
    const m = line.match(/^(\*?)\s*(say|do|action|speak)\s*[:\-–]\s*(.+)$/i);
    if (!m) continue;
    const kind = /^(say|speak)$/i.test(m[2]) ? "say" : "do";
    let body = m[3].trim().replace(/[,;]$/, "");
    if (m[1] && body.endsWith("*")) body = body.slice(0, -1);
    // An action is marked by its kind, so its asterisks go; spoken words keep *actions* in pairs.
    const unquoted = body.trim().replace(/^[“"](.*)[”"]$/, "$1").trim();
    // Spoken choices keep a tiny *smiles*, but not a paragraph of narration about the user.
    const spoken = () =>
      closeAsterisks(unquoted)
        .replace(/\*([^*]+)\*/g, (all, inner: string) => (inner.trim().split(/\s+/).length > 5 ? "" : all))
        .replace(/\s{2,}/g, " ");
    const words = (kind === "do" ? unquoted.replace(/\*/g, "") : spoken()).trim();
    if (!words || out.some((c) => c.text === words)) continue;
    out.push({ kind, text: words });
  }
  return out.slice(0, 3);
}
