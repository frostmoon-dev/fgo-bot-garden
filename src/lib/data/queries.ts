import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { momentSpriteSchema, type MomentView } from "@/lib/moment";
import type {
  BackgroundView,
  CharacterView,
  MessageView,
  PersonaView,
  SessionView,
  SettingsView,
  SpriteSetView,
} from "@/lib/types";
import type { Mode } from "@/lib/parser/types";
import { TAGS } from "./cache";

const characterInclude = {
  expressions: { orderBy: [{ sortOrder: "asc" as const }, { key: "asc" as const }] },
  spriteSets: {
    orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }],
    include: { faces: { include: { expression: { select: { key: true } } } } },
  },
};

// Bond and memories change as stories go on, so they are read separately (listBonds, getMemories) and
// kept out of the cache.
function findCharacterRows() {
  return db.character.findMany({ include: characterInclude, omit: { bond: true, memories: true }, orderBy: { name: "asc" } });
}

type CharacterRow = Awaited<ReturnType<typeof findCharacterRows>>[number];

function toSpriteSet(row: CharacterRow["spriteSets"][number]): SpriteSetView {
  const { faces, characterId: _c, sortOrder: _s, ...rest } = row;
  return { ...rest, faces: Object.fromEntries(faces.map((f) => [f.expression.key, f.cellIndex])) };
}

function toCharacter(row: CharacterRow): CharacterView {
  const { expressions, spriteSets, createdAt: _a, updatedAt: _b, ...rest } = row;
  return {
    ...rest,
    expressions: expressions.map(({ id, key, label, description }) => ({ id, key, label, description })),
    spriteSets: spriteSets.map(toSpriteSet),
  };
}

// Cached results go through JSON, so these return plain data only (no Date objects).
// Writes in the app expire the cache at once. REFRESH also picks up edits made outside the app
// (for example in the Supabase dashboard): after it, the next request refreshes in the background.
const REFRESH = 600;

const cachedCharacters = unstable_cache(async () => (await findCharacterRows()).map(toCharacter), ["characters"], {
  tags: [TAGS.characters],
  revalidate: REFRESH,
});

export async function listCharacters(): Promise<CharacterView[]> {
  return cachedCharacters();
}

// Read fresh: they change in the background as stories go on.
export async function getMemories(characterId: string): Promise<string> {
  const row = await db.character.findUnique({ where: { id: characterId }, select: { memories: true } });
  return row?.memories ?? "";
}

export async function getCharacter(id: string): Promise<CharacterView | null> {
  return (await cachedCharacters()).find((c) => c.id === id) ?? null;
}

export const listBackgrounds = unstable_cache(
  async (): Promise<BackgroundView[]> => db.background.findMany({ orderBy: { key: "asc" } }),
  ["backgrounds"],
  { tags: [TAGS.backgrounds], revalidate: REFRESH },
);

// Single-row tables: read, and create the row only the first time.
export const getPersona = unstable_cache(
  async (): Promise<PersonaView> => {
    const row =
      (await db.persona.findUnique({ where: { id: 1 } })) ??
      (await db.persona.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }));
    return { name: row.name, description: row.description, addressAs: row.addressAs, role: row.role };
  },
  ["persona"],
  { tags: [TAGS.persona], revalidate: REFRESH },
);

function oneOf<T extends string>(value: string, allowed: readonly T[]): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : allowed[0];
}

export const getSettings = unstable_cache(
  async (): Promise<SettingsView> => {
    const row =
      (await db.settings.findUnique({ where: { id: 1 } })) ??
      (await db.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }));
    const { id: _id, ...rest } = row;
    return {
      ...rest,
      promptProfile: oneOf(row.promptProfile, ["balanced", "compact", "strict"]),
      memoryPlacement: oneOf(row.memoryPlacement, ["end", "top"]),
      exampleMode: oneOf(row.exampleMode, ["auto", "always", "never"]),
      replyLength: oneOf(row.replyLength, ["scene", "short", "long"]),
      narrationStyle: oneOf(row.narrationStyle, ["italic", "plain"]),
      frameStyle: oneOf(row.frameStyle, ["fgo", "simple"]),
      // Fonts that were removed fall back to the default.
      font: oneOf(row.font, ["fgo", "clear", "dyslexic"]),
    };
  },
  ["settings"],
  { tags: [TAGS.settings], revalidate: REFRESH },
);

export const listEnabledLore = unstable_cache(
  async () =>
    db.lorebookEntry.findMany({
      where: { enabled: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, keywords: true, content: true, enabled: true },
    }),
  ["lore-enabled"],
  { tags: [TAGS.lore], revalidate: REFRESH },
);

// Read fresh: it grows with every reply.
export async function getBond(characterId: string): Promise<number> {
  const row = await db.character.findUnique({ where: { id: characterId }, select: { bond: true } });
  return row?.bond ?? 0;
}

// The interludes already started with a character, newest first per interlude.
export async function listInterludes(characterId: string): Promise<{ n: number; storyId: string; title: string }[]> {
  const rows = await db.session.findMany({
    where: { mainCharacterId: characterId, interlude: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, interlude: true },
  });
  const seen = new Set<number>();
  return rows.flatMap((r) => (r.interlude && !seen.has(r.interlude) && seen.add(r.interlude) ? [{ n: r.interlude, storyId: r.id, title: r.title }] : []));
}

// Kept moments, newest first.
export async function listMoments(): Promise<MomentView[]> {
  const rows = await db.moment.findMany({ orderBy: { createdAt: "desc" } });
  const ids = rows.flatMap((r) => (r.sessionId ? [r.sessionId] : []));
  const alive = new Set((await db.session.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((s) => s.id));
  return rows.map((r) => {
    const sprite = momentSpriteSchema.safeParse(r.sprite);
    return {
      id: r.id,
      sessionId: r.sessionId,
      storyTitle: r.storyTitle,
      imageUrl: r.imageUrl,
      sprite: sprite.success ? sprite.data : null,
      speaker: r.speaker,
      color: r.color,
      text: r.text,
      narration: r.narration,
      createdAt: r.createdAt.toISOString(),
      storyExists: !!r.sessionId && alive.has(r.sessionId),
    };
  });
}

export async function listBonds(): Promise<Record<string, number>> {
  const rows = await db.character.findMany({ select: { id: true, bond: true } });
  return Object.fromEntries(rows.map((r) => [r.id, r.bond]));
}

export async function listSessions() {
  return db.session.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      mainCharacter: { select: { name: true, color: true } },
      cast: { select: { characterId: true, spriteSetId: true } },
      _count: { select: { messages: true } },
      // The latest line, shown on the story card.
      messages: {
        orderBy: [{ order: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { role: true, activeVariant: true, variants: { orderBy: { position: "asc" }, select: { content: true } } },
      },
    },
  });
}

export async function getSession(id: string): Promise<SessionView | null> {
  const row = await db.session.findUnique({
    where: { id },
    include: {
      cast: true,
      messages: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { variants: { orderBy: { position: "asc" }, select: { id: true, content: true } } },
      },
      saves: { orderBy: { slot: "asc" }, select: { slot: true, label: true, createdAt: true } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    mode: row.mode as Mode,
    mainCharacterId: row.mainCharacterId,
    backgroundId: row.backgroundId,
    summary: row.summary,
    summarizedUntil: row.summarizedUntil,
    memory: row.memory,
    scene: row.scene,
    premise: row.premise,
    cast: row.cast.map((c) => ({ characterId: c.characterId, spriteSetId: c.spriteSetId })),
    messages: row.messages.map(
      (m): MessageView => ({
        id: m.id,
        order: m.order,
        role: m.role as MessageView["role"],
        activeVariant: m.activeVariant,
        pinned: m.pinned,
        variants: m.variants,
      }),
    ),
    saves: row.saves.map((s) => ({ slot: s.slot, label: s.label, createdAt: s.createdAt.toISOString() })),
  };
}
