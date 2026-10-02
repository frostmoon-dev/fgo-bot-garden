// Long stories drift into loops: the model copies its own recent replies, so a phrase or a running topic
// comes back every turn. Before each reply, the recent replies are checked for both, and the prompt
// names them so the next reply moves on. Pure text work: no extra request.

const RECENT = 6;
const MAX_PHRASES = 6;
const PHRASE_WORDS = 5;
const MAX_PHRASE_WORDS = 8;
// A topic counts as stuck when it is in this many of the last TOPIC_WINDOW replies.
const TOPIC_WINDOW = 4;
const TOPIC_HITS = 4;

// Words that say nothing about the topic.
const STOP = new Set(
  ("about above after again against almost along already also although always among another anyone anything around " +
    "because been before behind being below between both cannot could didn does doing done down during each either " +
    "enough even ever every everyone everything from further have having here herself himself into itself just know " +
    "least less like little look looks made make many maybe might more most much must myself near need never next " +
    "nothing once only other ought over perhaps please quite rather really right said same says seem seems shall " +
    "should since some something still such sure take than that their them themselves then there these they thing " +
    "things think this those though through till together toward under until upon very want wants well were what " +
    "when where whether which while whole whom whose will with within without would yeah yours your you'll you're " +
    "it's that's what's there's don't won't can't isn't i'm i'll i've let's okay gonna wanna gotta going come comes " +
    "back away first last long good great tell told says asks eyes face hand hands head voice smile smiles moment " +
    "looks turns little just senpai master").split(" "),
);

function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}'’]+/gu) ?? [];
}

// A reply as plain text, without tags or commands.
function plain(reply: string): string {
  return reply
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/^\s*\[[^\]]*\]\s*/gm, "")
    .replace(/^\s*\((?:narration|thought:[^)]*)\)\s*/gim, "");
}

export interface Repetition {
  // Phrases that came back in more than one recent reply, as written.
  phrases: string[];
  // Topics every recent reply returned to, which the user's last message didn't bring up.
  topics: string[];
}

export function findRepetition(replies: string[], userText = "", names: string[] = []): Repetition {
  const recent = replies.slice(-RECENT).map(plain);
  if (recent.length < 2) return { phrases: [], topics: [] };
  const skip = new Set(names.flatMap((n) => words(n)));

  // Phrases: any run of PHRASE_WORDS words found in two or more replies. Overlapping runs merge into one.
  const seenIn = new Map<string, Set<number>>();
  recent.forEach((reply, i) => {
    const w = words(reply);
    for (let k = 0; k + PHRASE_WORDS <= w.length; k++) {
      const gram = w.slice(k, k + PHRASE_WORDS).join(" ");
      if (!seenIn.has(gram)) seenIn.set(gram, new Set());
      seenIn.get(gram)!.add(i);
    }
  });
  const isRepeated = (gram: string) =>
    (seenIn.get(gram)?.size ?? 0) >= 2 && gram.split(" ").some((w) => w.length > 3 && !STOP.has(w));
  // Back-to-back repeated runs in one reply are one phrase: "bb waits eyes locked on shiru expecting".
  const spans = new Map<string, number>();
  for (const reply of recent) {
    const w = words(reply);
    let from = -1;
    for (let k = 0; k <= w.length; k++) {
      const hit = k + PHRASE_WORDS <= w.length && isRepeated(w.slice(k, k + PHRASE_WORDS).join(" "));
      if (hit && from < 0) from = k;
      if (!hit && from >= 0) {
        const span = w.slice(from, k - 1 + PHRASE_WORDS).join(" ");
        spans.set(span, (spans.get(span) ?? 0) + 1);
        from = -1;
      }
    }
  }
  // The same words show up as a longer span in one reply and a shorter one in another: keep the shortest.
  const phrases = [...spans.keys()]
    .filter((a) => ![...spans.keys()].some((b) => b !== a && a.includes(b)))
    .sort((a, b) => spans.get(b)! - spans.get(a)!)
    .slice(0, MAX_PHRASES)
    // A whole repeated reply is one long span; its start is enough to recognise it, and costs fewer tokens.
    .map((p) => (p.split(" ").length > MAX_PHRASE_WORDS ? `${p.split(" ").slice(0, MAX_PHRASE_WORDS).join(" ")}…` : p));

  // Topics: content words in nearly every recent reply.
  const window = recent.slice(-TOPIC_WINDOW);
  const asked = new Set(words(userText));
  const topics: string[] = [];
  if (window.length >= TOPIC_HITS) {
    const counts = new Map<string, number>();
    for (const reply of window) {
      for (const w of new Set(words(reply))) {
        if (w.length < 4 || STOP.has(w) || skip.has(w) || asked.has(w)) continue;
        counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
    for (const [w, n] of [...counts].sort((a, b) => b[1] - a[1])) if (n >= TOPIC_HITS && topics.length < 3) topics.push(w);
  }
  return { phrases, topics };
}

export function repetitionNote({ phrases, topics }: Repetition): string | null {
  if (!phrases.length && !topics.length) return null;
  return [
    "# DON'T REPEAT YOURSELF",
    phrases.length > 0 && `These phrases already came up in recent replies. Do not use them again, not even reworded: ${phrases.map((p) => `"${p}"`).join(", ")}.`,
    topics.length > 0 && `Every recent reply came back to: ${topics.join(", ")}. Leave it alone this time unless {{user}} brings it up.`,
    "Vary how the reply opens and ends, and move the scene forward: something new should happen, be said or be revealed.",
  ]
    .filter(Boolean)
    .join("\n");
}
