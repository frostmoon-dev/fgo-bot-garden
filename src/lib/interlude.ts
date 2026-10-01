// Interludes, as in FGO: private side stories a growing bond unlocks. Each one is an opening scene the AI
// writes from the character's definition and what they remember of the user, played like a written scene.

export interface Interlude {
  n: number;
  level: number;
  // What this interlude is about, for the scene writer.
  theme: string;
}

export const INTERLUDES: Interlude[] = [
  { n: 1, level: 3, theme: "a small, quiet moment that shows a side of {{char}} others rarely see" },
  { n: 2, level: 5, theme: "something from {{char}}'s past, a private habit or a hidden worry comes to light" },
  { n: 3, level: 7, theme: "a turning point: {{char}} lets {{user}} see something true about themselves" },
];

export function interludeFor(n: number): Interlude | null {
  return INTERLUDES.find((i) => i.n === n) ?? null;
}

export function interludePrompt(char: string, user: string, theme: string): string {
  return `You are a writing assistant, not a character. Write the opening scene of an Interlude: a private side story between ${char} and ${user} in a visual novel, the kind unlocked by a growing bond.
This interlude is about ${theme.replaceAll("{{char}}", char).replaceAll("{{user}}", user)}.
- Build on ${char}'s definition and on what ${char} remembers of ${user}. Stay true to their relationship exactly as it is defined: if they don't talk, they still don't; if ${char} is cold, they are still cold. Show the bond in small things, not sudden declarations.
- Set a specific place and time, and what is happening as the story begins. Only ${char} and ${user}, unless the definition needs someone else.
- ${user} is the player's character: never write their words, feelings, thoughts or choices.
- Present tense, third person. Two or three short paragraphs, at most 160 words. End at the moment something is about to happen.
- No dialogue lines, no markdown, no notes. Use the language the definition is written in.
Reply in exactly this shape:
Title: a short title for the interlude, at most 6 words
Scene: the opening scene`;
}

// The model's reply: a title line, then the scene. Missing labels are tolerated.
export function parseInterlude(text: string): { title: string; scene: string } {
  const clean = text.replace(/\*\*|__/g, "").trim();
  const title = clean.match(/^\s*title\s*:\s*(.+)$/im)?.[1].trim().replace(/^["“]|["”]$/g, "") ?? "";
  const afterScene = clean.match(/^\s*scene\s*:\s*([\s\S]+)$/im)?.[1];
  const scene = (afterScene ?? clean.replace(/^\s*title\s*:.*$/im, "")).trim();
  return { title: title.slice(0, 60), scene };
}
