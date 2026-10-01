import type { Beat } from "@/lib/stage/beats";

// The story as plain text to keep or reread: names before spoken lines, narration on its own, a marker
// where the place changes, and a blank line between messages. Nothing of the AI's tag format.
export function storyText(title: string, beats: Beat[], placeName: (key: string) => string, now = new Date()): string {
  const out = [title, `Saved ${now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, ""];
  let place: string | null = null;
  let message: string | null = null;
  for (const b of beats) {
    if (b.stage.backgroundKey && b.stage.backgroundKey !== place) {
      place = b.stage.backgroundKey;
      out.push("", `— ${placeName(place)} —`, "");
      message = b.messageId;
    }
    if (message !== null && b.messageId !== message) out.push("");
    message = b.messageId;
    if (b.thinker) out.push(`(${b.thinker.name}, thinking) ${b.text}`);
    else if (b.kind === "narration") out.push(b.text);
    else out.push(`${b.speakerName ?? "?"}: ${b.text}`);
  }
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export function storyFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${slug || "story"}.txt`;
}
