import "server-only";
import { db } from "@/lib/db";
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

const characterInclude = {
  expressions: { orderBy: [{ sortOrder: "asc" as const }, { key: "asc" as const }] },
  spriteSets: {
    orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }],
    include: { faces: { include: { expression: { select: { key: true } } } } },
  },
};

type CharacterRow = NonNullable<Awaited<ReturnType<typeof findCharacterRow>>>;

function findCharacterRow(id: string) {
  return db.character.findUnique({ where: { id }, include: characterInclude });
}

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

export async function getCharacter(id: string): Promise<CharacterView | null> {
  const row = await findCharacterRow(id);
  return row ? toCharacter(row) : null;
}

export async function listCharacters(): Promise<CharacterView[]> {
  const rows = await db.character.findMany({ include: characterInclude, orderBy: { name: "asc" } });
  return rows.map(toCharacter);
}

export async function listBackgrounds(): Promise<BackgroundView[]> {
  return db.background.findMany({ orderBy: { key: "asc" } });
}

export async function getPersona(): Promise<PersonaView> {
  const row = await db.persona.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return { name: row.name, description: row.description, addressAs: row.addressAs };
}

export async function getSettings(): Promise<SettingsView> {
  const { id: _id, ...row } = await db.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return row;
}

export async function listSessions() {
  return db.session.findMany({
    orderBy: { updatedAt: "desc" },
    include: { mainCharacter: { select: { name: true, color: true } }, _count: { select: { messages: true } } },
  });
}

export async function getSession(id: string): Promise<SessionView | null> {
  const row = await db.session.findUnique({
    where: { id },
    include: {
      cast: true,
      messages: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { variants: { orderBy: { position: "asc" } } },
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
    cast: row.cast.map((c) => ({ characterId: c.characterId, spriteSetId: c.spriteSetId })),
    messages: row.messages.map(
      (m): MessageView => ({
        id: m.id,
        order: m.order,
        role: m.role as MessageView["role"],
        activeVariant: m.activeVariant,
        variants: m.variants.map((v) => ({ id: v.id, content: v.content })),
      }),
    ),
    saves: row.saves.map((s) => ({ slot: s.slot, label: s.label, createdAt: s.createdAt.toISOString() })),
  };
}
