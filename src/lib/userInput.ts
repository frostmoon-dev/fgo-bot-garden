// What the user types: speech, with *actions* or (actions) mixed in, the usual roleplay habit.
// One box for both, so there is no mode to switch.
export interface UserSegment {
  kind: "say" | "do";
  text: string;
}

const ACTION = /\*([^*]+)\*|\(([^()]+)\)/g;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "Shiru sits down beside her" is an action even without asterisks: people rarely open a line
// of speech with their own name followed by a lowercase word.
function narratesSelf(text: string, userName?: string): boolean {
  const name = userName?.trim();
  return !!name && new RegExp(`^${escapeRegExp(name)}(?:'s)?\\s+\\p{Ll}`, "u").test(text);
}

// Reads a lone asterisk the way it was meant. "*hugs her" opens an action that runs to the end;
// "hugs her*" closes one that began after the last complete pair (or at the start). An asterisk
// touching no word, as in "there *", is a stray and goes.
export function closeAsterisks(text: string): string {
  const t = text.replace(/\*{2,}/g, "*");
  const stars = [...t.matchAll(/\*/g)].map((m) => m.index!);
  if (stars.length % 2 === 0) return t;
  const lone = stars.at(-1)!;
  if (/\S/.test(t[lone + 1] ?? "")) return `${t.trimEnd()}*`;
  if (!/\S/.test(t[lone - 1] ?? "")) return t.slice(0, lone) + t.slice(lone + 1);
  const from = stars.length > 1 ? stars.at(-2)! + 1 : 0;
  const lead = t.slice(from).match(/^\s*/)![0].length;
  return `${t.slice(0, from + lead)}*${t.slice(from + lead)}`;
}

export function splitUserText(raw: string, userName?: string): UserSegment[] {
  const text = closeAsterisks(raw);
  const out: UserSegment[] = [];
  const say = (s: string) => {
    const t = s.replace(/\*/g, "").trim().replace(/^[“"]([\s\S]*)[”"]$/, "$1").trim();
    if (t) out.push({ kind: narratesSelf(t, userName) ? "do" : "say", text: t });
  };
  let last = 0;
  for (const m of text.matchAll(ACTION)) {
    say(text.slice(last, m.index));
    const action = (m[1] ?? m[2]).trim();
    if (action) out.push({ kind: "do", text: action });
    last = m.index! + m[0].length;
  }
  say(text.slice(last));
  return out;
}

// Marks text as an action. Used for "do" choices and Ctrl+I in the reply box.
export function asAction(text: string): string {
  const t = text.trim();
  return t ? `*${t.replace(/^\*+|\*+$/g, "")}*` : t;
}

// In the prompt, actions are written in parentheses: asterisks there would teach the model to use them.
export function userTextForPrompt(text: string): string {
  return closeAsterisks(text).replace(/\*([^*]+)\*/g, "($1)");
}
