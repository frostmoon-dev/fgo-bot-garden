import { closeAsterisks } from "@/lib/userInput";

export interface Choice {
  kind: "say" | "do";
  text: string;
}

// Reads "SAY: …" / "DO: …" lines. Tolerates numbering, bullets and quotes around the words.
export function parseChoices(text: string): Choice[] {
  const out: Choice[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\*\*/g, "").replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
    const m = line.match(/^(say|do|action|speak)\s*[:\-–]\s*(.+)$/i);
    if (!m) continue;
    const kind = /^(say|speak)$/i.test(m[1]) ? "say" : "do";
    // An action is marked by its kind, so its asterisks go; spoken words keep *actions* in pairs.
    const unquoted = m[2].trim().replace(/^[“"](.*)[”"]$/, "$1").trim();
    const words = (kind === "do" ? unquoted.replace(/\*/g, "") : closeAsterisks(unquoted)).trim();
    if (!words) continue;
    out.push({ kind, text: words });
  }
  return out.slice(0, 3);
}
