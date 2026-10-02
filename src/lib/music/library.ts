import type { SceneFields } from "@/lib/scene";
import { timeOfDay } from "@/lib/scene";

// Background music that follows the story's atmosphere. Each track in public/music has one or more moods.
// The story's mood comes from the AI's {music:…} line when it writes one, else from the scene box
// (its Mood and Situation lines). Tracks were sorted by title; move one by editing its moods.

export const MUSIC_MOODS = ["calm", "cheerful", "playful", "tender", "sad", "night", "mystery", "tense", "dark", "battle", "epic", "sea"] as const;
export type MusicMood = (typeof MUSIC_MOODS)[number];
// What a {music:…} line can ask for: a mood, silence, or a character's theme ("theme:<character id>").
export type MusicCue = MusicMood | "silence" | `theme:${string}`;

export interface Track {
  file: string;
  title: string;
  artist: string;
  moods: MusicMood[];
}

export const TRACKS: Track[] = [
  { file: "amor-kana-colorful-destination.m4a", title: "Colorful Destination", artist: "Amor Kana", moods: ["calm"] },
  { file: "amor-kana-dancing-fairies.m4a", title: "Dancing Fairies", artist: "Amor Kana", moods: ["cheerful"] },
  { file: "amor-kana-drying-out-dreams.m4a", title: "Drying Out Dreams", artist: "Amor Kana", moods: ["mystery"] },
  { file: "amor-kana-fates-lamentation.m4a", title: "Fates Lamentation", artist: "Amor Kana", moods: ["sad"] },
  { file: "amor-kana-fleeting-dream-in-fog.m4a", title: "Fleeting Dream In Fog", artist: "Amor Kana", moods: ["mystery"] },
  { file: "amor-kana-gap-of-time.m4a", title: "Gap Of Time", artist: "Amor Kana", moods: ["mystery"] },
  { file: "amor-kana-gardenia.m4a", title: "Gardenia", artist: "Amor Kana", moods: ["calm"] },
  { file: "amor-kana-glass-on-the-water.m4a", title: "Glass On The Water", artist: "Amor Kana", moods: ["tender"] },
  { file: "amor-kana-holy-concert.m4a", title: "Holy Concert", artist: "Amor Kana", moods: ["epic"] },
  { file: "amor-kana-holy-night-of-heavy-snow.m4a", title: "Holy Night Of Heavy Snow", artist: "Amor Kana", moods: ["night"] },
  { file: "amor-kana-life-in-deep-green.m4a", title: "Life In Deep Green", artist: "Amor Kana", moods: ["calm"] },
  { file: "amor-kana-lone-world.m4a", title: "Lone World", artist: "Amor Kana", moods: ["sad"] },
  { file: "amor-kana-love-sakura.m4a", title: "Love Sakura", artist: "Amor Kana", moods: ["tender"] },
  { file: "amor-kana-ma-meno.m4a", title: "ma meno", artist: "Amor Kana", moods: ["mystery"] },
  { file: "amor-kana-mercury-town.m4a", title: "Mercury Town", artist: "Amor Kana", moods: ["mystery"] },
  { file: "amor-kana-night-of-the-world-tree.m4a", title: "Night Of The World Tree", artist: "Amor Kana", moods: ["night"] },
  { file: "amor-kana-norns.m4a", title: "NORNS", artist: "Amor Kana", moods: ["mystery"] },
  { file: "amor-kana-oblivion-of-the-full-moon.m4a", title: "Oblivion Of The Full Moon", artist: "Amor Kana", moods: ["night"] },
  { file: "amor-kana-ocean-of-the-heart.m4a", title: "Ocean Of The Heart", artist: "Amor Kana", moods: ["tender"] },
  { file: "amor-kana-ocean-of-the-heart-music-box.m4a", title: "Ocean Of The Heart(Music Box)", artist: "Amor Kana", moods: ["tender"] },
  { file: "amor-kana-pale-moon-drip.m4a", title: "Pale Moon Drip", artist: "Amor Kana", moods: ["night"] },
  { file: "amor-kana-sky-blue-rain.m4a", title: "Sky Blue Rain", artist: "Amor Kana", moods: ["sad"] },
  { file: "amor-kana-skyblue.m4a", title: "Skyblue", artist: "Amor Kana", moods: ["calm"] },
  { file: "amor-kana-tearful-moon.m4a", title: "Tearful Moon", artist: "Amor Kana", moods: ["sad"] },
  { file: "amor-kana-thoughts-on-amoonlit-night.m4a", title: "Thoughts On AMoonlit Night", artist: "Amor Kana", moods: ["night"] },
  { file: "amor-kana-to-the-angels-lost-their-wings-crystal.m4a", title: "To The Angels Lost Their Wings(Crystal)", artist: "Amor Kana", moods: ["sad"] },
  { file: "amor-kana-undying-moon.m4a", title: "Undying Moon", artist: "Amor Kana", moods: ["night"] },
  { file: "amor-kana-window-light.m4a", title: "Window Light", artist: "Amor Kana", moods: ["calm"] },
  { file: "came-lia-arrest.m4a", title: "Arrest", artist: "CAMeLIA", moods: ["battle"] },
  { file: "came-lia-dance-of-death.m4a", title: "Dance of death", artist: "CAMeLIA", moods: ["battle"] },
  { file: "came-lia-dinner-party.m4a", title: "Dinner Party", artist: "CAMeLIA", moods: ["playful"] },
  { file: "came-lia-gentle-nightmare.m4a", title: "Gentle Nightmare", artist: "CAMeLIA", moods: ["mystery"] },
  { file: "came-lia-gray-snow.m4a", title: "Gray Snow", artist: "CAMeLIA", moods: ["sad"] },
  { file: "came-lia-kakome-kakome.m4a", title: "Kakome Kakome", artist: "CAMeLIA", moods: ["dark"] },
  { file: "came-lia-like-a-machine.m4a", title: "like a machine", artist: "CAMeLIA", moods: ["tense"] },
  { file: "came-lia-loitering-alice.m4a", title: "Loitering Alice", artist: "CAMeLIA", moods: ["playful"] },
  { file: "came-lia-marine-blue.m4a", title: "Marine Blue", artist: "CAMeLIA", moods: ["calm"] },
  { file: "came-lia-moonlight.m4a", title: "Moonlight", artist: "CAMeLIA", moods: ["night"] },
  { file: "came-lia-shadow-chaser.m4a", title: "Shadow Chaser", artist: "CAMeLIA", moods: ["battle"] },
  { file: "came-lia-silent-eve.m4a", title: "silent eve", artist: "CAMeLIA", moods: ["sad"] },
  { file: "cnoc-aporia.m4a", title: "Aporia", artist: "Cnoc", moods: ["mystery"] },
  { file: "cnoc-autumn-rain-fall.m4a", title: "Autumn Rain Fall", artist: "Cnoc", moods: ["sad"] },
  { file: "cnoc-bird-cage.m4a", title: "Bird Cage", artist: "Cnoc", moods: ["tense"] },
  { file: "cnoc-bizarre-hunt.m4a", title: "Bizarre Hunt", artist: "Cnoc", moods: ["dark"] },
  { file: "cnoc-black-forest.m4a", title: "Black Forest", artist: "Cnoc", moods: ["dark"] },
  { file: "cnoc-blood-and-rust.m4a", title: "Blood And Rust", artist: "Cnoc", moods: ["dark"] },
  { file: "cnoc-bloodstain.m4a", title: "Bloodstain", artist: "Cnoc", moods: ["dark"] },
  { file: "cnoc-chasing.m4a", title: "Chasing", artist: "Cnoc", moods: ["battle"] },
  { file: "cnoc-children.m4a", title: "Children", artist: "Cnoc", moods: ["dark"] },
  { file: "cnoc-confrontation.m4a", title: "Confrontation", artist: "Cnoc", moods: ["battle"] },
  { file: "cnoc-curious-solidarity.m4a", title: "Curious Solidarity", artist: "Cnoc", moods: ["cheerful"] },
  { file: "cnoc-dead-end.m4a", title: "Dead End", artist: "Cnoc", moods: ["tense"] },
  { file: "cnoc-deceit.m4a", title: "Deceit", artist: "Cnoc", moods: ["tense"] },
  { file: "cnoc-demons-disposition.m4a", title: "Demons Disposition", artist: "Cnoc", moods: ["dark"] },
  { file: "cnoc-desert-on-the-moon.m4a", title: "Desert On The Moon", artist: "Cnoc", moods: ["night"] },
  { file: "cnoc-dqesque-continent.m4a", title: "DQesque Continent", artist: "Cnoc", moods: ["epic"] },
  { file: "cnoc-emergency.m4a", title: "Emergency", artist: "Cnoc", moods: ["battle"] },
  { file: "cnoc-endless-plain.m4a", title: "Endless Plain", artist: "Cnoc", moods: ["calm"] },
  { file: "cnoc-final-day.m4a", title: "Final Day", artist: "Cnoc", moods: ["dark"] },
  { file: "cnoc-floating-arcadia-piano.m4a", title: "Floating Arcadia(Piano)", artist: "Cnoc", moods: ["calm"] },
  { file: "cnoc-gray.m4a", title: "Gray", artist: "Cnoc", moods: ["sad"] },
  { file: "cnoc-heartbreak.m4a", title: "Heartbreak", artist: "Cnoc", moods: ["sad"] },
  { file: "cnoc-hollow-path.m4a", title: "Hollow Path", artist: "Cnoc", moods: ["mystery"] },
  { file: "cnoc-infection.m4a", title: "Infection", artist: "Cnoc", moods: ["tense"] },
  { file: "cnoc-into-the-unknown.m4a", title: "Into The Unknown", artist: "Cnoc", moods: ["mystery"] },
  { file: "cnoc-itrusted-you.m4a", title: "ITrusted You", artist: "Cnoc", moods: ["sad"] },
  { file: "cnoc-its-all-over.m4a", title: "Its All Over", artist: "Cnoc", moods: ["sad"] },
  { file: "cnoc-just-abad-feeling.m4a", title: "Just ABad Feeling", artist: "Cnoc", moods: ["tense"] },
  { file: "cnoc-mad-scientist.m4a", title: "Mad Scientist", artist: "Cnoc", moods: ["playful"] },
  { file: "cnoc-migraine.m4a", title: "Migraine", artist: "Cnoc", moods: ["tense"] },
  { file: "cnoc-nightmare.m4a", title: "Nightmare", artist: "Cnoc", moods: ["dark"] },
  { file: "cnoc-nostalgic-sea-piano-ver.m4a", title: "Nostalgic Sea(Piano Ver)", artist: "Cnoc", moods: ["sad"] },
  { file: "cnoc-ocean.m4a", title: "Ocean", artist: "Cnoc", moods: ["mystery"] },
  { file: "cnoc-prison.m4a", title: "Prison", artist: "Cnoc", moods: ["tense"] },
  { file: "cnoc-pursued-journey.m4a", title: "Pursued Journey", artist: "Cnoc", moods: ["battle"] },
  { file: "cnoc-repeating-pulse.m4a", title: "Repeating Pulse", artist: "Cnoc", moods: ["tense"] },
  { file: "cnoc-reverse-room.m4a", title: "Reverse Room", artist: "Cnoc", moods: ["mystery"] },
  { file: "cnoc-ringing-ears.m4a", title: "Ringing Ears", artist: "Cnoc", moods: ["tense"] },
  { file: "cnoc-ruins.m4a", title: "Ruins", artist: "Cnoc", moods: ["mystery"] },
  { file: "cnoc-run-the-warbeat-wasteland.m4a", title: "Run The Warbeat Wasteland", artist: "Cnoc", moods: ["battle"] },
  { file: "cnoc-small-fry-invasion.m4a", title: "Small Fry Invasion", artist: "Cnoc", moods: ["playful"] },
  { file: "cnoc-stagnant-water.m4a", title: "Stagnant Water", artist: "Cnoc", moods: ["mystery"] },
  { file: "cnoc-starved-man.m4a", title: "Starved Man", artist: "Cnoc", moods: ["dark"] },
  { file: "cnoc-strategem.m4a", title: "Strategem", artist: "Cnoc", moods: ["tense"] },
  { file: "cnoc-time-marches-on.m4a", title: "Time Marches On", artist: "Cnoc", moods: ["mystery"] },
  { file: "cnoc-town-bustle.m4a", title: "Town Bustle", artist: "Cnoc", moods: ["cheerful"] },
  { file: "cnoc-witchs-frolic.m4a", title: "Witchs Frolic", artist: "Cnoc", moods: ["playful"] },
  { file: "cnoc-yawl-moves-on.m4a", title: "Yawl Moves On", artist: "Cnoc", moods: ["calm"] },
  { file: "hagall-eccentric-witchs-shop.m4a", title: "Eccentric Witchs Shop", artist: "Hagall", moods: ["playful"] },
  { file: "hagall-further-than-the-moon.m4a", title: "Further Than The Moon", artist: "Hagall", moods: ["night"] },
  { file: "hagall-inventionear-piano.m4a", title: "inventionear(Piano)", artist: "Hagall", moods: ["calm"] },
  { file: "hagall-rusted-chain.m4a", title: "Rusted Chain", artist: "Hagall", moods: ["dark"] },
  { file: "hagall-tree-shade-waltz.m4a", title: "Tree Shade Waltz", artist: "Hagall", moods: ["calm"] },
  { file: "maou-damashii-boss02.m4a", title: "Boss02", artist: "Maou Damashii", moods: ["battle"] },
  { file: "maou-damashii-boss03.m4a", title: "Boss03", artist: "Maou Damashii", moods: ["battle"] },
  { file: "maou-damashii-boss04.m4a", title: "Boss04", artist: "Maou Damashii", moods: ["battle"] },
  { file: "maou-damashii-boss05.m4a", title: "Boss05", artist: "Maou Damashii", moods: ["battle"] },
  { file: "maou-damashii-event05.m4a", title: "Event05", artist: "Maou Damashii", moods: ["mystery"] },
  { file: "maou-damashii-event17.m4a", title: "Event17", artist: "Maou Damashii", moods: ["mystery"] },
  { file: "maou-damashii-event18.m4a", title: "Event18", artist: "Maou Damashii", moods: ["tense"] },
  { file: "maou-damashii-event31.m4a", title: "Event31", artist: "Maou Damashii", moods: ["dark"] },
  { file: "maou-damashii-event37.m4a", title: "Event37", artist: "Maou Damashii", moods: ["epic"] },
  { file: "maou-damashii-piano1.m4a", title: "Piano1", artist: "Maou Damashii", moods: ["sad"] },
  { file: "maou-damashii-theme08.m4a", title: "Theme08", artist: "Maou Damashii", moods: ["dark"] },
  { file: "maou-damashii-town12b.m4a", title: "Town12b", artist: "Maou Damashii", moods: ["calm"] },
  { file: "maou-damashii-village08.m4a", title: "Village08", artist: "Maou Damashii", moods: ["calm"] },
  { file: "mus-mus-honeymoon.m4a", title: "Honeymoon", artist: "MusMus", moods: ["tender"] },
  { file: "music-egg-all-alone.m4a", title: "All Alone", artist: "Music Egg", moods: ["sad"] },
  { file: "music-egg-breaking-heart.m4a", title: "Breaking Heart", artist: "Music Egg", moods: ["sad"] },
  { file: "music-egg-bud.m4a", title: "Bud", artist: "Music Egg", moods: ["cheerful"] },
  { file: "music-egg-candy-song.m4a", title: "Candy Song", artist: "Music Egg", moods: ["cheerful"] },
  { file: "music-egg-clock-spinning.m4a", title: "Clock Spinning", artist: "Music Egg", moods: ["mystery"] },
  { file: "music-egg-happy-days.m4a", title: "Happy Days", artist: "Music Egg", moods: ["cheerful"] },
  { file: "music-egg-himari.m4a", title: "Himari", artist: "Music Egg", moods: ["cheerful"] },
  { file: "music-egg-lamp-in-one-hand.m4a", title: "Lamp In One Hand", artist: "Music Egg", moods: ["calm"] },
  { file: "music-egg-little-joys.m4a", title: "Little Joys", artist: "Music Egg", moods: ["cheerful"] },
  { file: "music-egg-magic-crones-residence.m4a", title: "Magic Crones Residence", artist: "Music Egg", moods: ["playful"] },
  { file: "music-egg-maids-work-diary.m4a", title: "Maids Work Diary", artist: "Music Egg", moods: ["cheerful"] },
  { file: "music-egg-skirmish.m4a", title: "Skirmish", artist: "Music Egg", moods: ["battle"] },
  { file: "music-egg-suspicious-healers-workshop.m4a", title: "Suspicious Healers Workshop", artist: "Music Egg", moods: ["playful"] },
  { file: "music-egg-the-preparing-people.m4a", title: "The Preparing People", artist: "Music Egg", moods: ["epic"] },
  { file: "music-egg-under-the-same-sky.m4a", title: "Under The Same Sky", artist: "Music Egg", moods: ["tender"] },
  { file: "music-egg-waltz-of-destiny.m4a", title: "Waltz Of Destiny", artist: "Music Egg", moods: ["epic"] },
  { file: "music-egg-wondrous-time.m4a", title: "Wondrous Time", artist: "Music Egg", moods: ["cheerful"] },
  { file: "music-egg-youll-be-late.m4a", title: "Youll Be Late", artist: "Music Egg", moods: ["cheerful"] },
  { file: "muz-muz-impromptu-for-my-slumber.m4a", title: "Impromptu For My Slumber", artist: "MusMus", moods: ["tender"] },
  { file: "on-jin-bgm-loop-suspense-r02.m4a", title: "BGM-Loop Suspense R02", artist: "On-Jin", moods: ["tense"] },
  { file: "on-jin-bgm-loop-variety-r01.m4a", title: "BGM-Loop Variety R01", artist: "On-Jin", moods: ["playful"] },
  { file: "senses-circuit-jack-olantern.m4a", title: "Jack OLantern", artist: "Senses Circuit", moods: ["playful"] },
  { file: "senses-circuit-loop-86.m4a", title: "loop_86", artist: "Senses Circuit", moods: ["tense"] },
  { file: "senses-circuit-memorys-sigh.m4a", title: "Memorys Sigh", artist: "Senses Circuit", moods: ["sad"] },
  { file: "senses-circuit-sunbeam-spot-piano-ver.m4a", title: "Sunbeam Spot-Piano Ver-", artist: "Senses Circuit", moods: ["calm"] },
  { file: "senses-circuit-uneasines-s.m4a", title: "Uneasines S", artist: "Senses Circuit", moods: ["tense"] },
  { file: "senses-circuit-wish.m4a", title: "Wish", artist: "Senses Circuit", moods: ["tender"] },
  { file: "sesea.m4a", title: "Sea", artist: "Sound effect", moods: ["sea"] },
];

export function trackUrl(track: Track): string {
  return `/music/${track.file}`;
}

// Words in the scene box that point to each mood. The Mood line counts double.
const MOOD_WORDS: Record<Exclude<MusicMood, "night" | "sea">, string[]> = {
  battle: ["fight", "battle", "combat", "attack", "clash", "duel", "ambush", "war", "skirmish", "brawl", "showdown"],
  dark: ["ominous", "dread", "sinister", "menac", "creepy", "horror", "eerie", "haunt", "blood", "death", "despair", "nightmare", "cruel", "macabre", "grim"],
  tense: ["tense", "tension", "uneasy", "unease", "suspicio", "suspense", "nervous", "anxious", "danger", "chase", "escape", "threat", "alarm", "urgent", "cornered", "wary", "guarded", "standoff"],
  sad: ["sad", "sorrow", "grief", "mourn", "melanchol", "lonely", "loneliness", "tearful", "tears", "crying", "heartbr", "farewell", "goodbye", "bittersweet", "regret", "loss", "somber", "sombre"],
  tender: ["tender", "romantic", "romance", "intimate", "affection", "warm", "gentle", "soft", "flustered", "shy", "sweet", "cozy", "cosy", "loving", "closeness", "longing", "yearning"],
  mystery: ["mysterious", "mystery", "strange", "dreamlike", "dreamy", "surreal", "uncanny", "enigma", "dream", "magical", "otherworldly", "hazy", "illusion"],
  epic: ["solemn", "grand", "epic", "heroic", "resolve", "determined", "triumph", "sacred", "holy", "ceremon", "momentous"],
  playful: ["playful", "teas", "mischie", "chaotic", "silly", "comedic", "comic", "funny", "smug", "prank", "banter", "scheming", "antics"],
  cheerful: ["cheerful", "happy", "lively", "festive", "bright", "celebrat", "excited", "joy", "upbeat", "energetic", "loud", "fun", "bustling"],
  calm: ["calm", "peaceful", "relaxed", "quiet", "lazy", "idle", "casual", "everyday", "routine", "serene", "easygoing", "leisurely"],
};
// When two moods score the same, the stronger one wins.
const PRIORITY: (keyof typeof MOOD_WORDS)[] = ["battle", "dark", "tense", "sad", "tender", "mystery", "epic", "playful", "cheerful", "calm"];
const SEA = /\b(beach|sea|seaside|shore|ocean|coast|waves?)\b/i;

export function moodOfScene(scene: SceneFields): MusicMood | null {
  const mood = (scene.Mood ?? "").toLowerCase();
  const situation = (scene.Situation ?? "").toLowerCase();
  let best: { mood: keyof typeof MOOD_WORDS; score: number } | null = null;
  for (const key of PRIORITY) {
    const score = MOOD_WORDS[key].reduce((sum, w) => sum + (mood.includes(w) ? 2 : 0) + (situation.includes(w) ? 1 : 0), 0);
    if (score > (best?.score ?? 0)) best = { mood: key, score };
  }
  const found = best?.mood ?? null;
  // A calm scene takes its colour from the place and the hour.
  if (!found || found === "calm") {
    if (SEA.test(scene.Location ?? "")) return "sea";
    if (timeOfDay(scene.Time) === "night") return "night";
  }
  return found;
}

// The same story keeps the same track for a mood, so music doesn't hop between tracks every reply.
export function pickTrack(storyId: string, mood: MusicMood): Track | null {
  const list = TRACKS.filter((t) => t.moods.includes(mood));
  if (!list.length) return null;
  let hash = 0;
  for (const ch of `${storyId}:${mood}`) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return list[Math.abs(hash) % list.length];
}

const THEME_MOODS = new Set<MusicMood>(["calm", "night", "sea", "cheerful", "playful"]);

// Which music plays: the AI's cue, else the scene's mood. In light moods (calm, cheerful, playful) the
// leading character's theme plays, else a background's own track; heavier moods get mood music.
export function musicFor(opts: {
  storyId: string;
  cue: MusicCue | undefined;
  scene: SceneFields | null;
  backgroundMusic: string | null;
  // The theme of whoever leads the scene (the last to walk on stage, else the main character), in their
  // current ascension.
  mainTheme?: string | null;
  // Character id -> theme, for {music:Name} cues.
  themeOf?: (characterId: string) => string | null;
}): string | null {
  if (opts.cue === "silence") return null;
  if (opts.cue?.startsWith("theme:")) {
    const theme = opts.themeOf?.(opts.cue.slice(6));
    if (theme) return theme;
  }
  const cued = opts.cue && !opts.cue.startsWith("theme:") ? (opts.cue as MusicMood) : undefined;
  const mood = cued ?? (opts.scene ? moodOfScene(opts.scene) : null);
  // Light moods are carried by the leading character's theme; heavier ones get mood music.
  const light = !mood || THEME_MOODS.has(mood);
  if (light && !cued && opts.mainTheme) return opts.mainTheme;
  if ((!mood || mood === "calm") && opts.backgroundMusic) return opts.backgroundMusic;
  const track = pickTrack(opts.storyId, mood ?? "calm");
  return track ? trackUrl(track) : opts.backgroundMusic;
}

// Each character's signature theme, by name, with optional themes per ascension (by its name).
// Picked from the titles and each character's personality; change any of them here.
export const CHARACTER_THEMES: Record<string, { theme: string; forms?: Record<string, string> }> = {
  // BB Channel is a variety show.
  BB: { theme: "on-jin-bgm-loop-variety-r01.m4a", forms: { Swimsuit: "came-lia-marine-blue.m4a" } },
  // The child of prophecy, carrying everyone's wishes.
  Castoria: { theme: "senses-circuit-wish.m4a" },
  // A paladin from the age of heroic tales.
  Charlemagne: { theme: "music-egg-the-preparing-people.m4a" },
  // The lonely queen of the underworld.
  Ereshkigal: { theme: "amor-kana-lone-world.m4a" },
  // Carrying a light through the journey.
  Fujimaru: { theme: "music-egg-lamp-in-one-hand.m4a" },
  // The King of Heroes and his kingdom.
  Gilgamesh: { theme: "cnoc-dqesque-continent.m4a" },
  // The fairy-tale writer at his desk.
  Hans: { theme: "hagall-inventionear-piano.m4a" },
  // Venus: bright, colourful, a little vain.
  Ishtar: { theme: "amor-kana-colorful-destination.m4a" },
  // Gothic vengeance.
  "Jeanne Alter": { theme: "came-lia-dance-of-death.m4a" },
  // A doll-like Alter Ego: a music box.
  Kazuradrop: { theme: "amor-kana-ocean-of-the-heart-music-box.m4a" },
  // Sweet on the surface, a nightmare underneath.
  Kiara: { theme: "came-lia-gentle-nightmare.m4a" },
  // The prima ballerina: a waltz.
  Meltryllis: { theme: "music-egg-waltz-of-destiny.m4a" },
  // The queen of a doomed Britain.
  Morgan: { theme: "amor-kana-fates-lamentation.m4a" },
  // A swordsmith among iron and old blades.
  Muramasa: { theme: "hagall-rusted-chain.m4a" },
  // The emperor who loves to perform.
  Nero: { theme: "amor-kana-holy-concert.m4a" },
  // Dreams, then the night of the World Tree, then the hollow at the bottom of everything.
  Oberon: {
    theme: "amor-kana-fleeting-dream-in-fog.m4a",
    forms: { "Traveler's Cloak": "amor-kana-night-of-the-world-tree.m4a", Vortigern: "cnoc-hollow-path.m4a" },
  },
  // A cruel fairy at play.
  "Tam Lin Tristan": { theme: "cnoc-witchs-frolic.m4a" },
};

export function characterTheme(name: string, form?: string | null): string | null {
  const entry = CHARACTER_THEMES[name];
  if (!entry) return null;
  return `/music/${(form && entry.forms?.[form]) || entry.theme}`;
}
