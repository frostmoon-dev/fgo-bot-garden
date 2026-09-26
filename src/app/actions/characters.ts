"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actionResult";
import { requireAuth } from "@/lib/auth/server";
import { safe } from "@/lib/safeAction";
import { db } from "@/lib/db";
import { invalidate, TAGS } from "@/lib/data/cache";
import { getCharacter } from "@/lib/data/queries";
import { characterExportSchema, type CharacterExport } from "@/lib/characterExport";
import type { ExpressionView } from "@/lib/types";
import { DEFAULT_EXPRESSIONS } from "@/lib/expressions";
import { MOTION_STYLES, type MotionStyle } from "@/lib/motion";

const NEUTRAL = DEFAULT_EXPRESSIONS[0];

// Definition fields, shared by the character profile and each ascension.
const definitionSchema = z.object({
  description: z.string().max(20000),
  personality: z.string().max(20000),
  speechStyle: z.string().max(20000),
  lore: z.string().max(40000),
  relationship: z.string().max(20000),
  scenario: z.string().max(20000),
  greeting: z.string().max(20000),
  exampleDialogues: z.string().max(40000),
  openingScene: z.string().max(2000),
});
export type DefinitionInput = z.infer<typeof definitionSchema>;

const motionStyle = z.enum(Object.keys(MOTION_STYLES) as [MotionStyle, ...MotionStyle[]]);

// An ascension's definition, plus its motion style ("" = the character's).
const ascensionSchema = definitionSchema.extend({ motion: z.union([motionStyle, z.literal("")]) });
export type AscensionInput = z.infer<typeof ascensionSchema>;

const profileSchema = definitionSchema.extend({
  name: z.string().trim().min(1).max(80),
  motion: motionStyle,
  aliases: z.array(z.string().trim().min(1).max(80)).max(20),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  defaultSpriteSetId: z.string().nullable(),
  defaultBackgroundId: z.string().nullable(),
});
export type CharacterProfileInput = z.infer<typeof profileSchema>;

const expressionKey = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, _ or -");

const expressionsSchema = z
  .array(
    z.object({
      id: z.string().optional(),
      key: expressionKey,
      label: z.string().max(80),
      description: z.string().max(500),
    }),
  )
  .max(100)
  .refine((list) => list.some((e) => e.key === "neutral"), "A neutral expression is required")
  .refine((list) => new Set(list.map((e) => e.key)).size === list.length, "Expression ids must be unique");

const spriteSetSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sheetUrl: z.string().trim().min(1).max(2000),
  sheetWidth: z.number().int().min(1).max(10000),
  sheetHeight: z.number().int().min(1).max(20000),
  bodyHeight: z.number().int().min(1).max(20000),
  cellSize: z.number().int().min(1).max(4000),
  columns: z.number().int().min(1).max(40),
  faceCount: z.number().int().min(0).max(400),
  faceX: z.number().int().min(-10000).max(10000),
  faceY: z.number().int().min(-10000).max(10000),
});
export type SpriteSetInput = z.infer<typeof spriteSetSchema>;

function touch(characterId?: string) {
  invalidate(TAGS.characters);
  revalidatePath("/");
  revalidatePath("/characters");
  if (characterId) revalidatePath(`/characters/${characterId}`);
}

export async function createCharacter(name: string): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const created = await db.character.create({
      data: {
        name: z.string().trim().min(1).max(80).parse(name),
        // Start with the standard list, so the user only has to pick faces for them.
        expressions: { create: DEFAULT_EXPRESSIONS.map((e, i) => ({ ...e, sortOrder: i })) },
      },
    });
    touch();
    return created.id;
  });
}

// Saves one ascension's own definition. Empty fields use the character's profile.
export async function updateAscension(spriteSetId: string, input: AscensionInput): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const data = ascensionSchema.parse(input);
    const set = await db.spriteSet.update({ where: { id: spriteSetId }, data });
    touch(set.characterId);
  });
}

export async function updateCharacterProfile(id: string, input: CharacterProfileInput): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const data = profileSchema.parse(input);
    await db.character.update({ where: { id }, data });
    touch(id);
  });
}

export async function saveExpressions(
  characterId: string,
  input: z.input<typeof expressionsSchema>,
): Promise<ActionResult<ExpressionView[]>> {
  return safe(async () => {
    await requireAuth();
    const list = expressionsSchema.parse(input);
    await db.$transaction(async (tx) => {
      const existing = await tx.expression.findMany({ where: { characterId } });
      const keepIds = new Set(list.map((e) => e.id).filter(Boolean));
      const removed = existing.filter((e) => !keepIds.has(e.id));
      if (removed.length) await tx.expression.deleteMany({ where: { id: { in: removed.map((e) => e.id) } } });
      // Rename in two passes so swapping keys does not hit the unique constraint.
      for (const e of list) {
        if (e.id && existing.some((x) => x.id === e.id)) {
          await tx.expression.update({ where: { id: e.id }, data: { key: `__tmp_${e.id}` } });
        }
      }
      for (const [i, e] of list.entries()) {
        const data = { key: e.key, label: e.label, description: e.description, sortOrder: i };
        if (e.id && existing.some((x) => x.id === e.id)) {
          await tx.expression.update({ where: { id: e.id }, data });
        } else {
          await tx.expression.create({ data: { ...data, characterId } });
        }
      }
    });
    touch(characterId);
    const saved = await db.expression.findMany({ where: { characterId }, orderBy: { sortOrder: "asc" } });
    return saved.map(({ id, key, label, description }) => ({ id, key, label, description }));
  });
}

export async function createSpriteSet(characterId: string, input: SpriteSetInput): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const data = spriteSetSchema.parse(input);
    const count = await db.spriteSet.count({ where: { characterId } });
    const set = await db.spriteSet.create({ data: { ...data, characterId, sortOrder: count } });
    const character = await db.character.findUnique({ where: { id: characterId } });
    if (character && !character.defaultSpriteSetId) {
      await db.character.update({ where: { id: characterId }, data: { defaultSpriteSetId: set.id } });
    }
    touch(characterId);
    return set.id;
  });
}

export async function updateSpriteSet(
  spriteSetId: string,
  input: SpriteSetInput,
  faces: Record<string, number>,
): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const data = spriteSetSchema.parse(input);
    const faceMap = z.record(z.string(), z.number().int().min(-1).max(400)).parse(faces);
    const set = await db.spriteSet.update({ where: { id: spriteSetId }, data });
    const expressions = await db.expression.findMany({ where: { characterId: set.characterId } });
    await db.$transaction([
      db.spriteFace.deleteMany({ where: { spriteSetId } }),
      db.spriteFace.createMany({
        data: expressions
          .filter((e) => faceMap[e.key] !== undefined)
          .map((e) => ({ spriteSetId, expressionId: e.id, cellIndex: faceMap[e.key] })),
      }),
    ]);
    touch(set.characterId);
  });
}

export async function deleteSpriteSet(spriteSetId: string): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const set = await db.spriteSet.delete({ where: { id: spriteSetId } });
    await db.character.updateMany({
      where: { id: set.characterId, defaultSpriteSetId: spriteSetId },
      data: { defaultSpriteSetId: null },
    });
    await db.sessionCast.updateMany({ where: { spriteSetId }, data: { spriteSetId: null } });
    touch(set.characterId);
  });
}

export async function deleteCharacter(id: string): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.sessionCast.deleteMany({ where: { characterId: id } });
    await db.character.delete({ where: { id } });
    touch();
  });
}

async function exportCharacterData(id: string): Promise<CharacterExport> {
  {
    const c = await getCharacter(id);
    if (!c) throw new Error("Character not found");
    const bg = c.defaultBackgroundId
      ? await db.background.findUnique({ where: { id: c.defaultBackgroundId } })
      : null;
    return {
      format: "fgo-bot-garden/character",
      version: 1,
      character: {
        name: c.name,
        aliases: c.aliases,
        color: c.color,
        motion: c.motion,
        description: c.description,
        personality: c.personality,
        speechStyle: c.speechStyle,
        lore: c.lore,
        relationship: c.relationship,
        scenario: c.scenario,
        greeting: c.greeting,
        exampleDialogues: c.exampleDialogues,
        openingScene: c.openingScene,
      },
      expressions: c.expressions.map(({ key, label, description }) => ({ key, label, description })),
      spriteSets: c.spriteSets.map(({ id: _id, ...s }) => s),
      defaultSpriteSet: c.spriteSets.find((s) => s.id === c.defaultSpriteSetId)?.name ?? null,
      defaultBackgroundKey: bg?.key ?? null,
    };
  }
}

async function importCharacterData(json: unknown, nameOverride?: string): Promise<string> {
  {
    const data = characterExportSchema.parse(json);
    const expressions = data.expressions.some((e) => e.key === "neutral")
      ? data.expressions
      : [NEUTRAL, ...data.expressions];
    const bg = data.defaultBackgroundKey
      ? await db.background.findUnique({ where: { key: data.defaultBackgroundKey } })
      : null;

    const id = await db.$transaction(async (tx) => {
      const character = await tx.character.create({
        data: {
          ...data.character,
          name: nameOverride ?? data.character.name,
          defaultBackgroundId: bg?.id ?? null,
          expressions: { create: expressions.map((e, i) => ({ ...e, sortOrder: i })) },
        },
        include: { expressions: true },
      });
      const byKey = new Map(character.expressions.map((e) => [e.key, e.id]));
      let defaultSetId: string | null = null;
      for (const [i, { faces, ...set }] of data.spriteSets.entries()) {
        const created = await tx.spriteSet.create({
          data: {
            ...set,
            characterId: character.id,
            sortOrder: i,
            faces: {
              create: Object.entries(faces)
                .filter(([key]) => byKey.has(key))
                .map(([key, cellIndex]) => ({ expressionId: byKey.get(key)!, cellIndex })),
            },
          },
        });
        if (set.name === data.defaultSpriteSet || (!defaultSetId && i === 0)) defaultSetId = created.id;
      }
      await tx.character.update({ where: { id: character.id }, data: { defaultSpriteSetId: defaultSetId } });
      return character.id;
    });
    touch();
    return id;
  }
}

export async function exportCharacter(id: string): Promise<ActionResult<CharacterExport>> {
  return safe(async () => {
    await requireAuth();
    return exportCharacterData(id);
  });
}

export async function importCharacter(json: unknown): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    return importCharacterData(json);
  });
}

// What the character remembers about the user across stories. Kept out of the character cache, so no touch().
export async function saveCharacterMemories(id: string, memories: string): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.character.update({ where: { id }, data: { memories: z.string().max(6000).parse(memories).trim() } });
  });
}

export async function duplicateCharacter(id: string): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const exported = await exportCharacterData(id);
    return importCharacterData(exported, `${exported.character.name} (copy)`);
  });
}
