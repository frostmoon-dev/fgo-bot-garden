import { readFormChange } from "@/lib/story/formChange";
import { closeAsterisks } from "@/lib/userInput";
import { EFFECTS, POSITIONS, type Effect, type ParserCharacter, type ParserContext, type Position, type ScriptLine } from "./types";

// Any {word:args}. Misspelled command names are matched in command(); anything else is dropped,
// so braces never reach the text box.
const COMMAND = /\{\s*([a-z]{3,10})\s*:([^{}]*)\}/gi;
const COMMANDS = ["scene", "enter", "exit", "effect", "form"] as const;
const LEADING_BRACES = /^\{[^{}]*\}/;
// A tag word at the start of a line: (narration) [Narrator] {narartion} <dialogue>, or Narration:
const HEAD = /^[[({<]\s*([A-Za-z][A-Za-z' ]{0,18}?)\s*[\])}>]\s*:?\s*/;
const WORD_HEAD = /^([A-Za-z][A-Za-z']{1,12})\s*:\s*/;
// The same tag word in the middle of a line: "Hello. (narration) She waves."
const MID_HEAD = /\s[[({<]\s*([A-Za-z]{3,12})\s*[\])}>]/g;
// Out-of-character notes: (OOC: …), [A/N …], Note: … They break the story, so they are dropped.
const META_LINE = /^[[(]\s*(?:ooc|a\/n|author'?s? note)\b[\s\S]*[\])]\s*$/i;
// The model's own planning, leaked into the reply: "We need to continue the scene: …", "The user wants …".
// Only when it talks about the reply itself, so a character's "We need to go" stays.
const PLANNING = /^[(*\s]*(?:(?:ok(?:ay)?|alright|so|now|next|first|hmm+|well)\W+)*(?:(?:we|i)\s+(?:need|should|must|have|will|want|can)|let me|let's|let us)\b/i;
const PLAN_WORDS = /\b(?:(?:continue|write|describe|end|advance)\s+(?:the|this)\s+scene|the user|(?<!\{)user'?s?|reply|response|respond|roleplay|format|instructions?|prompt|narration|dialogue|tags?|output|persona|in character)\b/i;
const USER_PLAN = /^[(*\s]*(?:the\s+)?user(?:'s)?\s+(?:wants?|says?|said|asks?|asked|is|has|chose|replied|writes?|wrote)\b/i;
// Scene-box fields copied into a line: "present: Shiru, Ritsuka. Mood: quiet relief."
const SCENE_FIELD = /\b(location|present|mood|situation|weather)\s*:/gi;

function isPlanning(text: string): boolean {
  if (USER_PLAN.test(text) || (PLANNING.test(text) && PLAN_WORDS.test(text))) return true;
  const fields = new Set([...text.matchAll(SCENE_FIELD)].map((m) => m[1].toLowerCase()));
  return fields.size >= 2;
}
// [Name|expression] text. Also accepts "," or ":" as the separator and a colon after the tag.
const DIALOGUE_TAG = /^\[([^\]|,:]+?)\s*(?:[|,:]\s*([^\]]*?))?\s*\]\s*:?\s*([\s\S]*)$/;
// Name|expression: text (the brackets forgotten).
const BARE_TAG = /^([^\s|:[\](){}*"“][^|:[\](){}*"“]{0,40}?)\s*\|\s*([\w -]{1,40}?)\s*[:\]]\s*([\s\S]*)$/;
// Name (expression): text, or Name: text. Only used when Name is a known character or the user.
const NAME_LABEL = /^([^\s:[\](){}*"“][^:[\](){}*"“]{0,40}?)\s*(?:\(([\w -]{1,40})\))?\s*:\s*([\s\S]*)$/;
const WRAPPED_NARRATION = /^(?:\(([\s\S]+)\)|\*([^*]+)\*)$/;
// (thought:Name) text, also [thought:Name] and (thoughts|Name).
const THOUGHT = /^[[(]\s*thoughts?\s*[:|]\s*([^\])]+?)\s*[\])]\s*:?\s*([\s\S]+)$/i;
// Commands written without braces, often as narration: "(Enter:Shiru:center)", "JeanneAlter enters:right".
const LOOSE_COMMAND = /^([a-z]{3,10})\s*:\s*([^:\s][^:]*(?::[^:]*)??)[.!]?$/i;
const LOOSE_MOVE = /^(\S+(?:\s\S+)?)\s+(enters|exits|leaves)\s*:\s*([a-z]*)[.!]?$/i;
const INLINE_TAG = /\[[^\][|]+\|[^\]]*\]/g;
// A tag in the wrong brackets: (Oberon|serious), {BB|smirk}, <BB|smirk>, 【BB|smirk】, [BB|smirk).
// The "|" is required, so a plain "(smiles)" stays an action.
const ODD_TAG = /[[({<【]\s*([^|()[\]{}<>【】\n]{1,40}?)\s*\|\s*([^|()[\]{}<>【】\n]{0,40}?)\s*[\])}>】]/g;
const ACTION = /\*([^*]+)\*/g;
const QUOTED = /[“"]([^“”"]+)[”"]/g;
const HAS_QUOTE = /[“"][^“”"]+[”"]/;
const QUOTE_ONLY = /^\s*[“"][^“”"]*[”"]\s*$/;
// One sentence, with the closing quote or bracket that follows its punctuation.
const SENTENCE = /[^.!?…]+(?:[.!?…]+["”’)\]]*|$)\s*/g;

// Verbs that report speech or a choice. With the user as subject, the line speaks or decides for them.
const VERBS =
  "say|says|said|ask|asks|asked|reply|replies|replied|answer|answers|answered|respond|responds|responded|" +
  "whisper|whispers|whispered|murmur|murmurs|murmured|mutter|mutters|muttered|shout|shouts|shouted|yell|yells|yelled|" +
  "exclaim|exclaims|exclaimed|tell|tells|told|insist|insists|insisted|admit|admits|admitted|confess|confesses|confessed|" +
  "promise|promises|promised|agree|agrees|agreed|decide|decides|decided|accept|accepts|accepted|refuse|refuses|refused";
const ADVERB = "(?:\\p{L}+ly\\s+|then\\s+|finally\\s+|just\\s+)?";
const PRONOUNS = ["he", "she", "they", "him", "her", "them"];
// A sentence that carries on about whoever the last one was about: "She sets down her pen."
const CARRY_ON = /^(?:he|she|they|his|her|their)(?![\p{L}])/iu;
// "he"/"she" as the subject of a sentence, after at most a short opening clause.
const LEADING_PRONOUN = /^((?:[^,.!?"“”]{0,40},\s*)?(?:then\s+|finally\s+)?)(?:he|she)(?![\p{L}])/iu;
// Leaving the scene, for one character (singular and past forms) and for two ("BB and Oberon leave").
const LEAVE_END = String.raw`(?=\s*(?:[.!?,;…—–-]|$)|\s+(?:the\s+(?:room|hall|hallway|corridor|office|area|building|scene|house|shop|library|kitchen|stage)|without|through|for\s+(?:good|now|the\s+(?:night|day))|together|quietly|silently|at\s+last|as\s+well))`;
const MOVE_OFF = String.raw`\s+(?:out|off|away)`;
const DEPART_ONE = [
  `(?:leaves|left)${LEAVE_END}`,
  `(?:walks|walked|storms|stormed|runs|ran|hurries|hurried|slips|slipped|wanders|wandered|stomps|stomped|marches|marched|heads|headed|dashes|dashed|flies|flew|strolls|strolled|saunters|sauntered|stalks|stalked|rushes|rushed)${MOVE_OFF}`,
  String.raw`exits|exited|departs|departed|disappears|disappeared|vanishes|vanished`,
  String.raw`(?:takes|took)\s+(?:his|her|their)\s+leave`,
  String.raw`(?:is|was)\s+gone`,
  String.raw`(?:fades|faded)\s+(?:away|out)`,
].join("|");
const DEPART_TWO = [
  `(?:leave|left)${LEAVE_END}`,
  `(?:walk|walked|run|ran|hurry|hurried|head|headed|wander|wandered|stroll|strolled|rush|rushed)${MOVE_OFF}`,
  String.raw`exit|exited|depart|departed|disappear|disappeared|vanish|vanished`,
  String.raw`(?:take|took)\s+their\s+leave`,
  String.raw`(?:are|were)\s+gone`,
].join("|");
// Words between the name and the verb that mean someone else leaves, or nobody does:
// "Oberon watches as BB walks out", "BB almost leaves".
const NOT_LEAVING = /^(?:as|while|when|until|after|before|because|since|that|who|which|watch(?:es|ing)?|let(?:s|ting)?|see(?:s|ing)?|tell(?:s|ing)?|ask(?:s|ing)?|make(?:s|ing)?|almost|nearly|never|not|doesn't|don't|didn't|won't|wouldn't|can't|cannot|couldn't|isn't|wasn't|refuses?|refused|tries|tried|wants?|wanted|pretends?|pretended)$/i;
// Coming into the scene: "BB walks in", "Ishtar manages to come in", "Oberon appears", "BB and Meltryllis are here",
// "Ishtar dusts off her sleeves, stepping past the threshold". Present and past forms, and "to come in" after a
// verb like "manages".
const ARRIVE =
  String.raw`(?:enters|entered|enter|arrives|arrived|arrive|appears|appeared|appear|reappears|reappeared|materiali[sz]es|materiali[sz]ed|returns|returned|` +
  String.raw`(?:is|are|was|were)\s+(?:here|back|in\s+the\s+room)(?![\p{L}])|` +
  String.raw`(?:shows|showed|turns|turned)\s+up|(?:comes|came|come|coming)\s+(?:in|inside|back|through)|` +
  String.raw`(?:walks|walked|walk|walking|steps|stepped|step|stepping|bursts|burst|bursting|barges|barged|barge|strolls|strolled|` +
  String.raw`storms|stormed|slips|slipped|strides|strode|marches|marched|wanders|wandered|hurries|hurried|rushes|rushed|runs|ran|` +
  String.raw`sweeps|swept|saunters|sauntered|peeks|peeked|pokes|poked)\s+(?:in|inside|into|through|past\s+the\s+(?:threshold|door))|` +
  String.raw`joins\s+(?:them|you|us|the)|joined\s+(?:them|you|us|the))`;
// "…revealing Ishtar leaning against the frame", "In walks BB."
const REVEAL = String.raw`(?:reveal(?:s|ed|ing)?|in\s+(?:walks|comes|steps|strides|marches|bursts|storms)|there\s+(?:stands|stood))\s+(?:a\s+[\p{L}-]+\s+|an\s+[\p{L}-]+\s+)?`;
// Words just before the name that make it a question or a wish.
const NOT_YET = /(?:^|[\s,])(?:if|whether|unless|wish(?:es|ed)?|hopes?|hoped|wonders?|wondered|asks?|asked|imagines?|pretends?|until|once|when|in\s+case)\s+$/i;
// Words between the name and the verb that mean they don't come in (or someone else does).
const NOT_ARRIVING = /^(?:as|while|when|until|after|before|because|since|that|who|which|if|watch(?:es|ing)?|let(?:s|ting)?|see(?:s|ing)?|tell(?:s|ing)?|ask(?:s|ing)?|make(?:s|ing)?|almost|nearly|never|not|doesn't|don't|didn't|won't|wouldn't|can't|cannot|couldn't|isn't|wasn't|refuses?|refused|wants?|wanted|would|could|should|might|may|will|waits?|waiting|hopes?|expects?|imagines?|pictures?|thinks?|remembers?|forgets?)$/i;

// Names a model uses for the user's character in a tag: [You|smile], [Senpai|…], [Master|…].
const USER_WORDS = ["you", "user", "player", "senpai", "master"];

// Common emotion words mapped to expression ids a sheet is likely to have. Checked in order.
const SYNONYMS: [RegExp, string[]][] = [
  [/cry|tear|sob|weep/, ["crying", "sad"]],
  [/sad|unhapp|upset|hurt|down|disappoint|gloom/, ["sad", "troubled", "disappointed", "displeased"]],
  [/laugh|giggl|chuckl/, ["laugh", "eyes_closed_happy", "smile", "grin"]],
  [/smil|happ|joy|chee|glad|delight|bright/, ["smile", "happy", "laugh", "grin", "eyes_closed_happy"]],
  [/grin|smirk|smug|teas|playful|mischie|sly|scheme/, ["smirk", "smug", "sly", "grin", "smile"]],
  [/angr|mad|furious|irrit|annoy|rage/, ["angry", "annoyed", "glare", "shout", "pout"]],
  [/surpris|shock|startl|gasp|stun/, ["surprised", "shocked", "panic", "shout"]],
  [/embarr|blush|fluster|shy|bashful/, ["flustered", "shy", "embarrassed", "sulk"]],
  [/worr|nervous|anxi|uneas|concern|panic/, ["troubled", "worried", "anxious", "panic"]],
  [/evil|sinister|menac|dark|threat|yandere/, ["sinister", "evil", "menacing", "rage"]],
  [/think|confus|puzzl|curious|ponder/, ["confused", "thinking", "troubled", "serious"]],
  [/calm|default|normal|neutral|serious|cold/, ["neutral", "serious"]],
];

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function matchForm<F extends { name: string }>(forms: F[], raw: string): F | undefined {
  const key = norm(raw.replace(/["'’]/g, "").replace(/(?:^|_)(?:form|ascension)$/, ""));
  if (!key || forms.length < 2) return undefined;
  const exact = forms.find((f) => norm(f.name) === key);
  if (exact) return exact;
  // "2" or "ascension_2" for "Ascension 2".
  const number = key.match(/(\d+)$/)?.[1];
  const numbered = number ? forms.filter((f) => norm(f.name).match(/(\d+)$/)?.[1] === number) : [];
  if (numbered.length === 1) return numbered[0];
  const partial = forms.filter((f) => norm(f.name).includes(key) || key.includes(norm(f.name)));
  if (partial.length === 1) return partial[0];
  const fuzzy = forms.filter((f) => near(key, norm(f.name)));
  return fuzzy.length === 1 ? fuzzy[0] : undefined;
}

// "smiling" and "smile" -> "smil"; "angrily" and "angry" -> "angr".
function stem(word: string): string {
  return word.replace(/(ing|ily|ed|ly|y|s|e)$/, "");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^(?:[-•>]|\d+\.)\s+/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .trim();
}

function unquote(text: string): string {
  const t = text.trim();
  const m = t.match(/^[“"]([^“”"]*)[”"]$/);
  return m ? m[1].trim() : t;
}

function count(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

// Edit distance that counts two swapped letters as one edit ("Obreon" -> "Oberon").
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// A misspelling of target: no typo allowed in words under 5 letters, one from 5, two from 8.
function near(word: string, target: string): boolean {
  const allowed = target.length >= 8 ? 2 : target.length >= 5 ? 1 : 0;
  return Math.abs(word.length - target.length) <= allowed && distance(word, target) <= allowed;
}

const NARRATION_WORDS = ["narration", "narrator", "narrative", "narrate", "description", "action", "actions"];
const DIALOGUE_WORDS = ["dialogue", "dialog", "speech"];
// Meta words: scene-box lines the model copied, and notes to the reader.
const META_WORDS = ["ooc", "note", "notes", "location", "time", "weather", "present", "mood", "situation", "system"];

type HeadKind = "narration" | "dialogue" | "meta";

function headKind(word: string): HeadKind | null {
  const w = word.toLowerCase().replace(/[\s'_-]+/g, "");
  if (["nar", "narr", "desc"].includes(w) || NARRATION_WORDS.some((t) => near(w, t))) return "narration";
  if (DIALOGUE_WORDS.some((t) => near(w, t))) return "dialogue";
  if (META_WORDS.includes(w)) return "meta";
  return null;
}

function readHead(text: string): { kind: HeadKind; rest: string } | null {
  const m = text.match(HEAD) ?? text.match(WORD_HEAD);
  const kind = m ? headKind(m[1]) : null;
  return m && kind ? { kind, rest: text.slice(m[0].length) } : null;
}

// *Emphasis* inside a sentence is part of the speech, not an action: "In *that*?", "I *really* mean it."
// It is short and sits mid-sentence: a word right before it, and punctuation or a lower-case word right after.
// "Hi *waves* there" and "Fine. *sighs* Let's go." stay actions.
// Roleplay actions often written mid-line ("Hi *waves* there"): these stay actions wherever they are.
const ACTION_WORD =
  /^(?:sighs?|waves?|laughs?|giggles?|chuckles?|smiles?|grins?|smirks?|nods?|shrugs?|winks?|blushes|pouts?|huffs?|snorts?|yawns?|gasps?|coughs?|hums?|frowns?|groans?|whimpers?|sniffs?|scoffs?|blinks?|stares?|glares?|beams?|cries|sobs?|hugs?|bows?|clears?|leans?|looks?|turns?|points?|claps?|stretches|tilts?|rolls?|crosses?|taps?|pats?|puffs?|mutters?|whispers?)$/i;

function unwrapEmphasis(text: string): string {
  return text.replace(ACTION, (whole, inner: string, at: number) => {
    const words = inner.trim().split(/\s+/);
    if (words.length > 3 || ACTION_WORD.test(words[0])) return whole;
    const before = text.slice(0, at).trimEnd();
    const after = text.slice(at + whole.length);
    const continues = /^[?!.,;:…—–~-]/.test(after) || /^\s+[\p{Ll}\p{N}]/u.test(after);
    const midSentence = /[\p{L}\p{N}'’]$/u.test(before) || (!before && /^[?!]/.test(after));
    return continues && midSentence ? inner : whole;
  });
}

// Whatever format tokens are left in a line's text: a doubled tag, stray braces, lone asterisks.
function sanitize(text: string): string {
  return text
    // Single braces only: {{user}} and {{char}} are macros, filled in later.
    .replace(/(?<!\{)\{(?!\{)[^{}]*\}(?!\})/g, "")
    .replace(/^\s*\[[^\]]{1,40}\]\s*:?\s*/, "")
    // *actions* were split off before this, so any asterisk left is a stray.
    .replace(/\*+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Persona "Characters address them as": "Senpai / Master" -> ["Senpai", "Master"].
export function userAliases(addressAs: string): string[] {
  return addressAs.split(/[,/;]|\bor\b/).map((s) => s.trim()).filter((s) => s.length >= 2);
}

// Parses the AI's line-based output. Keeps the active speaker between lines.
// Weaker models drift from the format, so common variants are repaired here:
// bare "Name|expr:" tags, "{narration}", *actions* mixed into dialogue, prose with quotes,
// and lines written for the user's character.
export class ScriptParser {
  private activeSpeakerId: string | null = null;
  // Set after a line for the user's character, so the user's words that follow are dropped too.
  private userTurn = false;
  // The user's name, its parts and nicknames, longest first so "Ritsuka Fujimaru" wins over "Ritsuka".
  private readonly userNames: string[];
  // "Shiru says", "you quietly agree": the user as the subject of a speech verb.
  private readonly userSubject: RegExp;
  // "…," says Shiru
  private readonly userInverted: RegExp;
  // "Shiru looks up", "With a sigh, you nod": the user as the subject of a narration sentence.
  private readonly userActs: RegExp;
  // Anyone a quote can belong to: cast, user, pronouns.
  private readonly anyName: string;
  // "BB waves and heads out." / "With a sigh, Oberon leaves the room." / "BB and Oberon walk away."
  private readonly departure: RegExp | null;
  private readonly arrival: RegExp | null;
  private readonly revealed: RegExp | null;
  private readonly castNames: RegExp | null;

  constructor(private readonly ctx: ParserContext) {
    const parts = ctx.userName.split(/\s+/).filter((w) => w.length >= 3);
    this.userNames = [...new Set([ctx.userName.trim(), ...parts, ...(ctx.userAliases ?? [])].filter(Boolean))].sort(
      (a, b) => b.length - a.length,
    );
    const user = [...this.userNames.map(escapeRegExp), "\\{\\{user\\}\\}"].join("|");
    // Up to four words may come between: "Shiru looks up and says".
    this.userSubject = new RegExp(
      `(?<![\\p{L}\\p{N}])(?:${user}|you)(?:\\s+[\\p{L}'’-]+){0,4}?\\s+${ADVERB}(?:${VERBS})(?![\\p{L}])`,
      "iu",
    );
    this.userInverted = new RegExp(`["”]\\s*(?:${VERBS})\\s+(?:${user})(?![\\p{L}])`, "iu");
    // At the start of the sentence, after at most a short opening clause; not "Shiru's phone buzzes".
    this.userActs = new RegExp(
      `^(?:[^,.!?"“”]{0,40},\\s*)?(?:(?:then|finally|meanwhile|slowly|suddenly)\\s+)?(?:${user}|you)(?![\\p{L}\\p{N}'’])\\s+\\p{L}`,
      "iu",
    );
    const cast = ctx.characters.flatMap((c) => [c.name, ...c.aliases]).filter(Boolean);
    this.anyName = [...cast, ...this.userNames]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .concat(["\\{\\{user\\}\\}", "you", ...PRONOUNS])
      .join("|");
    const castName = [...cast].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
    this.arrival = castName
      ? new RegExp(`(?<![\\p{L}])(${castName})(?![\\p{L}'’])((?:[,\\s]+[\\p{L}'’-]+){0,6}?)[,\\s]+${ARRIVE}(?![\\p{L}])`, "iu")
      : null;
    this.revealed = castName ? new RegExp(`${REVEAL}(${castName})(?![\\p{L}'’])`, "iu") : null;
    this.castNames = castName ? new RegExp(`(?<![\\p{L}])(?:${castName})(?![\\p{L}'’])`, "giu") : null;
    this.departure = castName
      ? new RegExp(
          `^(?:[^,.!?"“”]{0,40},\\s*)?(?:then\\s+|finally\\s+)?(${castName})(?:(?:,\\s*|\\s+)and\\s+(${castName}))?` +
            `((?:,?\\s+[\\p{L}'’-]+){0,4}?)\\s+(?:(${DEPART_ONE})|(${DEPART_TWO}))(?![\\p{L}])`,
          "iu",
        )
      : null;
  }

  get activeSpeaker(): string | null {
    return this.activeSpeakerId;
  }

  parseText(text: string): ScriptLine[] {
    return text.split(/\r?\n/).flatMap((line) => this.parseLine(line));
  }

  parseLine(raw: string): ScriptLine[] {
    let rest = stripMarkdown(raw.trim()).replace(ODD_TAG, "[$1|$2]");
    if (!rest || rest.startsWith("```")) return [];
    if (META_LINE.test(rest)) {
      this.warn(`Dropped an out-of-character note: "${rest.slice(0, 40)}"`);
      return [];
    }

    const before: ScriptLine[] = [];
    let m: RegExpMatchArray | null;
    while (!readHead(rest) && (m = rest.match(LEADING_BRACES))) {
      before.push(...this.command(m[0]));
      rest = rest.slice(m[0].length).trim();
    }

    // Commands written after the text still count; they run after the line.
    const after: ScriptLine[] = [];
    rest = rest
      .replace(COMMAND, (cmd) => {
        after.push(...this.command(cmd));
        return "";
      })
      .trim();

    if (/^\{[^}]*$/.test(rest)) {
      this.warn(`Dropped a broken command "${rest.slice(0, 40)}"`);
      rest = "";
    }

    const body = rest ? this.segments(rest).flatMap((s) => this.textLine(s)) : [];
    // A form switched from the Menu adds "(narration) Name changes form: Form." The sprite follows it.
    const change = readFormChange(rest);
    if (change) after.push(...this.formLine(change.name, change.form, true));
    return [...before, ...body, ...after];
  }

  // Splits a line that holds several beats: "*action* [BB|smug] text *action* more text".
  private segments(line: string): string[] {
    const cuts = [
      ...[...line.matchAll(INLINE_TAG)].map((t) => t.index!),
      ...[...line.matchAll(MID_HEAD)].filter((h) => headKind(h[1]) === "narration").map((h) => h.index! + 1),
    ]
      .filter((i) => i > 0)
      .sort((a, b) => a - b);
    const pieces = [0, ...cuts].map((start, i) => line.slice(start, cuts[i] ?? line.length).trim()).filter(Boolean);

    const out: string[] = [];
    for (const piece of pieces) {
      if (!piece.includes("*") || WRAPPED_NARRATION.test(piece)) {
        out.push(piece);
        continue;
      }
      if (readHead(piece)?.kind === "narration") {
        // *emphasis* inside narration is still narration.
        out.push(piece.replace(/\*/g, ""));
        continue;
      }
      // Pull *actions* out as narration beats. Text after an action stays with the same speaker
      // as an untagged line, which keeps the current expression.
      const tag = piece.match(/^\[[^\]]*\]\s*:?/)?.[0] ?? "";
      // "Hello *waves" and "She smiles.*": a lone asterisk still marks an action.
      const body = unwrapEmphasis(closeAsterisks(piece.slice(tag.length)));
      let last = 0;
      let first = true;
      const pushText = (text: string) => {
        if (!text) return;
        out.push(first ? [tag, text].filter(Boolean).join(" ") : text);
        first = false;
      };
      for (const a of body.matchAll(ACTION)) {
        pushText(body.slice(last, a.index).trim());
        if (first && tag) {
          out.push(tag);
          first = false;
        }
        out.push(`*${a[1].trim()}*`);
        last = a.index! + a[0].length;
      }
      pushText(body.slice(last).trim());
      if (first && tag) out.push(tag);
    }
    return out;
  }

  private textLine(text: string, depth = 0): ScriptLine[] {
    const thought = text.match(THOUGHT);
    if (thought) return this.thought(thought[1], thought[2]);
    const loose = this.looseCommand(text);
    if (loose) return loose;
    const head = readHead(text);
    if (head?.kind === "narration") return this.narration(head.rest);
    if (head?.kind === "dialogue") return depth < 2 && head.rest.trim() ? this.textLine(head.rest, depth + 1) : [];
    if (head?.kind === "meta") {
      this.warn(`Dropped a meta line: "${text.slice(0, 40)}"`);
      return [];
    }
    if (!text.startsWith("[") && isPlanning(text)) {
      this.warn(`Dropped the model's planning: "${text.slice(0, 40)}"`);
      return [];
    }

    const tag = text.match(DIALOGUE_TAG);
    if (tag) {
      const kind = headKind(tag[1]);
      if (kind === "narration") return this.narration(tag[3]);
      if (kind === "dialogue" && depth < 2) return this.textLine(tag[3], depth + 1);
      return this.dialogue(tag[1], tag[2] ?? "", tag[3].trim());
    }

    const wrapped = text.match(WRAPPED_NARRATION);
    if (wrapped) return this.narration(wrapped[1] ?? wrapped[2]);

    const bare = text.match(BARE_TAG);
    if (bare && (this.isUser(bare[1]) || this.findCharacter(bare[1]))) return this.dialogue(bare[1], bare[2], bare[3].trim());

    const label = text.match(NAME_LABEL);
    if (label && (this.isUser(label[1]) || this.findCharacter(label[1]))) {
      return this.dialogue(label[1], label[2] ?? "", label[3].trim());
    }

    if (this.userTurn) {
      this.warn(`Dropped text that continues the user's turn: "${text.slice(0, 40)}"`);
      return [];
    }
    if (this.ctx.mode === "narrative" && HAS_QUOTE.test(text) && text.replace(QUOTED, "").trim()) {
      return this.prose(text);
    }

    const speaker = this.currentSpeaker();
    if (!speaker) return this.narration(text);
    const clean = unquote(sanitize(text));
    return clean ? [{ type: "dialogue", characterId: speaker.id, name: speaker.name, expression: "", text: clean }] : [];
  }

  // Novel-style prose: 'BB grins. "Hi, Senpai." She waves.' Quotes become dialogue, the rest narration.
  // A quote the prose gives to the user ("…," Shiru says) is dropped: a character never says the user's words.
  private prose(text: string): ScriptLine[] {
    const mentioned = this.ctx.characters.filter((c) =>
      [c.name, ...c.aliases].some((n) => new RegExp(`(^|[^\\w])${escapeRegExp(n)}([^\\w]|$)`, "i").test(text)),
    );
    const fallback = mentioned.length === 1 ? mentioned[0] : this.currentSpeaker();
    const quotes = [...text.matchAll(QUOTED)];
    const out: ScriptLine[] = [];
    let last = 0;
    quotes.forEach((q, i) => {
      const end = q.index! + q[0].length;
      const before = text.slice(last, q.index);
      const who = this.quoteSpeaker(before, text.slice(end, quotes[i + 1]?.index ?? text.length));
      out.push(...this.narration(before));
      const speaker = who === "user" ? null : (who ?? fallback);
      if (who === "user") {
        this.warn(`Dropped words written for the user: "${q[1].slice(0, 40)}"`);
      } else if (speaker) {
        this.activeSpeakerId = speaker.id;
        out.push({ type: "dialogue", characterId: speaker.id, name: speaker.name, expression: "", text: sanitize(q[1]) });
      } else {
        out.push(...this.narration(q[0]));
      }
      last = end;
    });
    out.push(...this.narration(text.slice(last)));
    return out;
  }

  // Who says a quote: the name in its tag ("…," BB says / says BB), or the subject of the sentence
  // leading into it (BB leans in. "…"). The user only counts with a speech verb, since
  // 'You look at BB. "Hey, Senpai~"' is still BB talking. Null when the prose doesn't say.
  private quoteSpeaker(before: string, after: string): ParserCharacter | "user" | null {
    const name = this.anyName;
    const tail = after.match(
      new RegExp(`^\\s*[,.!?…—–-]*\\s*(?:(${name})\\s+${ADVERB}(?:${VERBS})|(?:${VERBS})\\s+(${name}))(?![\\p{L}])`, "iu"),
    );
    if (tail) return this.speakerOf(tail[1] ?? tail[2], true);
    const lead = (before.match(SENTENCE) ?? []).map((s) => s.trim()).filter(Boolean).at(-1) ?? "";
    const subject = lead.match(new RegExp(`^(${name})(?![\\p{L}])`, "iu"));
    if (!subject) return null;
    const spoken = new RegExp(`(?<![\\p{L}])(?:${VERBS})(?![\\p{L}])[^.!?]*$`, "iu").test(lead);
    return this.speakerOf(subject[1], spoken);
  }

  private speakerOf(name: string, spoken: boolean): ParserCharacter | "user" | null {
    if (PRONOUNS.includes(name.toLowerCase())) return null;
    if (name.toLowerCase() === "you" || this.isUser(name)) return spoken ? "user" : null;
    return this.findCharacter(name) ?? null;
  }

  // Narration sentences that speak or choose for the user are dropped, with a quote right before them
  // ('"Wait!" Shiru shouts.'). Quotes inside a sentence don't count: '"Do you agree?" she asks.' stays.
  // Narration may describe the cast and the world, never the user's character: sentences where they speak
  // or decide ("Shiru says"), or act ("Shiru looks up from her desk.", "With a sigh, you nod."), are dropped,
  // with a following "She sets down her pen." that carries on about them. "Oberon hands Shiru a cup." stays.
  private withoutUserSpeech(text: string): string {
    const sentences = text.match(SENTENCE) ?? [text];
    const drop = new Set<number>();
    sentences.forEach((s, i) => {
      const plain = s.replace(QUOTED, '""').trim();
      const carriesOn = drop.has(i - 1) && CARRY_ON.test(plain);
      if (this.userSubject.test(plain) || this.userInverted.test(s) || this.userActs.test(plain) || carriesOn) {
        drop.add(i);
        if (i > 0 && QUOTE_ONLY.test(sentences[i - 1])) drop.add(i - 1);
      }
    });
    if (!drop.size) return text;
    this.warn(`Dropped narration that writes for the user: "${sentences.find((_, i) => drop.has(i))!.trim().slice(0, 40)}"`);
    return sentences.filter((_, i) => !drop.has(i)).join("").trim();
  }

  private currentSpeaker(): ParserCharacter | undefined {
    const id = this.activeSpeakerId ?? this.ctx.mainCharacterId;
    return this.ctx.characters.find((c) => c.id === id);
  }

  // The user's name, part of it ("Ritsuka" for Ritsuka Fujimaru), a nickname, "You", or a misspelling,
  // unless the name belongs to a cast member.
  private isUser(name: string): boolean {
    const n = norm(name);
    if (!n) return false;
    if (name.trim() === "{{user}}" || n === norm(this.ctx.userName)) return true;
    if (this.findCharacter(name)) return false;
    if (USER_WORDS.includes(n)) return true;
    const words = n.split(/[_()]+/).filter(Boolean);
    return this.userNames.map(norm).some((u) => near(n, u) || words.includes(u) || u.split("_").includes(n));
  }

  private dialogue(rawName: string, rawExpression: string, rawText: string): ScriptLine[] {
    const name = rawName.trim();
    if (this.isUser(name)) {
      this.warn(`Dropped a line written for the user's character: "${name}"`);
      this.userTurn = true;
      return [];
    }
    this.userTurn = false;
    const character = this.findCharacter(name);
    // "[BB|smug] BB: Hello" -> "Hello"
    const text = unquote(sanitize(rawText).replace(new RegExp(`^${escapeRegExp(character?.name ?? name)}\\s*:\\s*`, "i"), ""));
    if (!character) {
      this.warn(`Unknown character "${name}" — text kept, no sprite change`);
      return [{ type: "dialogue", characterId: null, name, expression: "neutral", text }];
    }
    if (norm(character.name) !== norm(name) && !character.aliases.some((a) => norm(a) === norm(name))) {
      this.warn(`Name "${name}" read as ${character.name}`);
    }
    this.activeSpeakerId = character.id;
    return [
      {
        type: "dialogue",
        characterId: character.id,
        name: character.name,
        expression: this.resolveExpression(character, rawExpression),
        text,
      },
    ];
  }

  // A character's private thought. Never the user's: what {{user}} thinks is theirs to write.
  private thought(rawName: string, rawText: string): ScriptLine[] {
    const name = rawName.trim();
    if (this.isUser(name) || name.toLowerCase() === "you") {
      this.warn(`Dropped a thought written for the user: "${rawText.trim().slice(0, 40)}"`);
      return [];
    }
    const text = unquote(sanitize(rawText.trim().replace(/\)\s*$/, "")));
    if (!text) return [];
    const character = this.findCharacter(name);
    return [{ type: "thought", characterId: character?.id ?? null, name: character?.name ?? name, text }];
  }

  private narration(raw: string): ScriptLine[] {
    // Leftovers of prose around a quote start with its punctuation: ', she says softly.'
    const kept = this.withoutUserSpeech(sanitize(raw));
    let text = kept.replace(/^[\s,;:—–-]+/, "");
    if (text !== kept) text = text.charAt(0).toUpperCase() + text.slice(1);
    // Drop a stray bracket left over from "(narration) text.)".
    while (/[)\]]$/.test(text) && count(text, /[)\]]/g) > count(text, /[([]/g)) text = text.slice(0, -1).trimEnd();
    // Leftovers such as "." between two quotes are not worth a beat.
    if (!/[\p{L}\p{N}]/u.test(text)) return [];
    if (this.userTurn && /^[“"]/.test(text)) {
      this.warn("Dropped a quote that belongs to the user's turn");
      return [];
    }
    this.userTurn = false;
    if (this.ctx.mode === "dialogue") {
      this.warn("Narration dropped in dialogue mode");
      return [];
    }
    return [...this.arrivals(text), { type: "narration", text }, ...this.departures(text)];
  }

  // Exits in the user's own actions: "*BB is gone.*" takes BB off the stage too.
  exitsIn(text: string): ScriptLine[] {
    return this.ctx.mode === "dialogue" ? [] : this.departures(text);
  }

  // Arrivals in the user's own message: "*Ishtar manages to come in.*" or "BB and Meltryllis are here."
  arrivalsIn(text: string): ScriptLine[] {
    return this.ctx.mode === "dialogue" ? [] : this.arrivals(text);
  }

  // Narration that brings a character into the scene puts their sprite on stage before the line, so they
  // are seen as the line announces them. Models often forget {enter:…}, and a silent newcomer stayed invisible.
  private arrivals(text: string): ScriptLine[] {
    if (!this.arrival || !this.revealed) return [];
    const ids = new Set<string>();
    for (const sentence of text.replace(QUOTED, '""').match(SENTENCE) ?? []) {
      const plain = sentence.trim();
      const shown = plain.match(this.revealed);
      if (shown) {
        const character = this.findCharacter(shown[1]);
        if (character) ids.add(character.id);
      }
      const m = plain.match(this.arrival);
      if (!m) continue;
      // "BB wonders if Oberon is here", "I wish BB were here": nobody comes in.
      if (NOT_YET.test(plain.slice(0, m.index))) continue;
      // "BB and Meltryllis are here": everyone named before the verb comes in.
      const together = [...m[2].matchAll(this.castNames!)].map((n) => n[0]);
      const rest = m[2].replace(this.castNames!, " ").split(/[\s,]+/).filter(Boolean);
      const group = together.length > 0 && rest.every((w) => /^(?:and|&)$/i.test(w));
      if (!group && m[2].split(/[\s,]+/).filter(Boolean).some((w) => NOT_ARRIVING.test(w) || this.findCharacter(w) || this.isUser(w) || /^(?:he|she|they)$/i.test(w))) continue;
      for (const name of [m[1], ...(group ? together : [])]) {
        const character = this.findCharacter(name);
        if (character) ids.add(character.id);
      }
    }
    return [...ids].map((characterId) => ({ type: "arrive" as const, characterId }));
  }

  // Narration that has a character leave also takes their sprite off the stage, after the line.
  // Models often forget {exit:…}, and a sprite left standing gets in the way of whoever stays.
  private departures(text: string): ScriptLine[] {
    if (!this.departure) return [];
    const ids = new Set<string>();
    // "With that parting remark, he exits the room.": he or she is whoever spoke last.
    const speaker = this.activeSpeakerId ? this.ctx.characters.find((c) => c.id === this.activeSpeakerId) : undefined;
    for (const sentence of text.replace(QUOTED, '""').match(SENTENCE) ?? []) {
      const plain = speaker ? sentence.trim().replace(LEADING_PRONOUN, (_, lead: string) => `${lead}${speaker.name}`) : sentence.trim();
      const m = plain.match(this.departure);
      if (!m) continue;
      const gap = m[3].split(/[\s,]+/).filter(Boolean);
      if (gap.some((w) => NOT_LEAVING.test(w) || this.findCharacter(w) || this.isUser(w))) continue;
      // "BB and Oberon leave" takes the plural verb (or a past form); "BB leaves" the singular one.
      const pastForm = /(?:ed|left|ran|flew|took|were|gone)\b/i.test(m[4] ?? "");
      if (m[2] ? !m[5] && !pastForm : !m[4]) continue;
      for (const name of [m[1], m[2]]) {
        const character = name ? this.findCharacter(name) : undefined;
        if (character) ids.add(character.id);
      }
    }
    return [...ids].map((characterId) => {
      this.warn(`${this.ctx.characters.find((c) => c.id === characterId)?.name} leaves the scene: sprite removed`);
      return { type: "exit" as const, characterId };
    });
  }

  // A stage command the model wrote without braces. Run it (or drop it) so it never reads as story text.
  private looseCommand(text: string): ScriptLine[] | null {
    const inner = text.trim().replace(/^\(([\s\S]*)\)$|^\*([\s\S]*)\*$/, "$1$2").trim();
    const cmd = inner.match(LOOSE_COMMAND);
    if (cmd && COMMANDS.some((c) => c === cmd[1].toLowerCase() || near(cmd[1].toLowerCase(), c))) {
      this.warn(`Read "${inner}" as a command`);
      return this.command(`{${cmd[1]}:${cmd[2]}}`);
    }
    const move = inner.match(LOOSE_MOVE);
    if (move && (this.findCharacter(move[1]) || this.isUser(move[1]))) {
      this.warn(`Read "${inner}" as a command`);
      const kind = move[2].toLowerCase() === "enters" ? "enter" : "exit";
      return this.command(`{${kind}:${move[1]}${move[3] ? `:${move[3]}` : ""}}`);
    }
    return null;
  }

  private command(raw: string): ScriptLine[] {
    const m = raw.match(/^\{\s*(\w+)\s*:([^{}]*)\}$/);
    if (!m) {
      this.warn(`Ignored unknown command ${raw}`);
      return [];
    }
    const word = m[1].toLowerCase();
    const kind = COMMANDS.find((c) => c === word || near(word, c));
    const args = m[2].split(":").map((a) => a.trim());
    // A form change is about the character, not the stage, so it counts in dialogue mode too.
    if (kind === "form") return args.length >= 2 ? this.formLine(args[0], args.slice(1).join(":")) : this.formOnly(args[0] ?? "");
    if (this.ctx.mode === "dialogue") {
      this.warn(`Command ${raw} ignored in dialogue mode`);
      return [];
    }

    if (kind === "effect") {
      const name = (args[0] ?? "").toLowerCase();
      const effect: Effect | undefined = EFFECTS.find((e) => e === name || near(name, e));
      if (!effect) {
        this.warn(`Unknown effect "${args[0]}" — ignored`);
        return [];
      }
      return [{ type: "effect", effect }];
    }

    if (kind === "scene") {
      const wanted = norm(args[0] ?? "");
      const key =
        this.ctx.backgrounds.find((b) => norm(b) === wanted) ?? this.ctx.backgrounds.find((b) => near(wanted, norm(b)));
      if (!key) {
        this.warn(`Unknown background "${args[0]}" — command ignored`);
        return [];
      }
      return [{ type: "scene", backgroundKey: key }];
    }

    if (kind === "enter" || kind === "exit") {
      if (this.isUser(args[0] ?? "")) {
        this.warn(`Ignored ${raw}: the user's character has no sprite`);
        return [];
      }
      const character = this.findCharacter(args[0] ?? "");
      if (!character) {
        this.warn(`Unknown character "${args[0]}" in ${raw} — command ignored`);
        return [];
      }
      if (kind === "exit") return [{ type: "exit", characterId: character.id }];
      const position = (args[1] ?? "").toLowerCase() as Position;
      if (!POSITIONS.includes(position)) {
        this.warn(`Unknown position "${args[1] ?? ""}" in ${raw} — using center`);
      }
      return [
        {
          type: "enter",
          characterId: character.id,
          position: POSITIONS.includes(position) ? position : "center",
        },
      ];
    }

    this.warn(`Ignored unknown command ${raw}`);
    return [];
  }

  // {form:Name:Form}. The form is matched loosely: "Vortigern", "vortigern form", "2" for "Ascension 2".
  private formLine(name: string, form: string, silent = false): ScriptLine[] {
    const character = this.findCharacter(name);
    if (!character) {
      this.warn(`Unknown character "${name}" in a form change — ignored`);
      return [];
    }
    const set = matchForm(character.forms ?? [], form);
    if (!set) {
      this.warn(`${character.name} has no form "${form}" — ignored`);
      return [];
    }
    return [{ type: "form", characterId: character.id, spriteSetId: set.id, ...(silent && { silent }) }];
  }

  // {form:Vortigern} without a name: the one character who has a form by that name.
  private formOnly(form: string): ScriptLine[] {
    const owners = this.ctx.characters.filter((c) => matchForm(c.forms ?? [], form));
    if (owners.length !== 1) {
      this.warn(`Form change "${form}" names no character — ignored`);
      return [];
    }
    return this.formLine(owners[0].name, form);
  }

  private findCharacter(name: string): ParserCharacter | undefined {
    const key = norm(name);
    if (!key) return undefined;
    const exact = this.ctx.characters.find(
      (c) => norm(c.name) === key || c.aliases.some((a) => norm(a) === key),
    );
    if (exact) return exact;
    // "JeanneAlter" for Jeanne Alter.
    const joined = key.replace(/_/g, "");
    const squashed = this.ctx.characters.find((c) => [c.name, ...c.aliases].some((n) => norm(n).replace(/_/g, "") === joined));
    if (squashed) return squashed;
    // "Oberon Vortigern" or "BB (Summer)": a known name as a whole word of a longer one.
    const words = new Set(key.split(/[_()]+/).filter(Boolean));
    const partial = this.ctx.characters.filter((c) => [c.name, ...c.aliases].some((n) => words.has(norm(n))));
    if (partial.length === 1) return partial[0];
    // Misspelled: "Obreon" -> Oberon. Short names like "BB" must match exactly.
    const fuzzy = this.ctx.characters.filter((c) => [c.name, ...c.aliases].some((n) => near(key, norm(n))));
    return fuzzy.length === 1 ? fuzzy[0] : undefined;
  }

  private resolveExpression(character: ParserCharacter, raw: string): string {
    // "(smile)", "smile|happy" or "smile, happy": the first word is the expression.
    const key = norm(raw.replace(/[()[\]"']/g, "").split(/[|,/]/)[0] ?? "");
    if (!key) return "neutral";
    const list = character.expressions;
    const exact = list.find((e) => norm(e) === key);
    if (exact) return exact;
    const close =
      list.find((e) => near(key, norm(e))) ??
      list.find((e) => stem(norm(e)).length >= 3 && stem(norm(e)) === stem(key)) ??
      // "happy" -> "eyes_closed_happy", "smug_grin" -> "smug"
      list.find((e) => norm(e).split("_").includes(key) || key.split("_").includes(norm(e)));
    const candidate = close ?? SYNONYMS.find(([pattern]) => pattern.test(key))?.[1].find((c) => list.includes(c));
    if (candidate) {
      this.warn(`Expression "${raw}" for ${character.name} mapped to "${candidate}"`);
      return candidate;
    }
    this.warn(`Unknown expression "${raw}" for ${character.name} — using neutral`);
    return "neutral";
  }

  private warn(message: string) {
    this.ctx.warn?.(message);
  }
}

// Writes parsed lines back in the canonical format. The model copies its own earlier replies,
// so a cleaned-up history keeps weaker models on format.
export function toScript(lines: ScriptLine[], characters: Pick<ParserCharacter, "id" | "name" | "forms">[]): string {
  const nameOf = (id: string) => characters.find((c) => c.id === id)?.name ?? id;
  const expressionOf = new Map<string, string>();
  return lines
    .map((l) => {
      switch (l.type) {
        case "dialogue": {
          // An untagged line keeps the speaker's current face.
          const expression = l.expression || expressionOf.get(l.name) || "neutral";
          expressionOf.set(l.name, expression);
          return `[${l.name}|${expression}]${l.text ? ` ${l.text}` : ""}`;
        }
        case "narration":
          return `(narration) ${l.text}`;
        case "thought":
          return `(thought:${l.name}) ${l.text}`;
        case "scene":
          return `{scene:${l.backgroundKey}}`;
        case "enter":
          return `{enter:${nameOf(l.characterId)}:${l.position}}`;
        case "exit":
          return `{exit:${nameOf(l.characterId)}}`;
        // Read from the narration itself, so writing the narration back is enough.
        case "arrive":
          return "";
        case "effect":
          return `{effect:${l.effect}}`;
        case "form": {
          if (l.silent) return "";
          const character = characters.find((c) => c.id === l.characterId);
          const form = character?.forms?.find((f) => f.id === l.spriteSetId)?.name;
          return character && form ? `{form:${character.name}:${form}}` : "";
        }
      }
    })
    .filter(Boolean)
    .join("\n");
}
