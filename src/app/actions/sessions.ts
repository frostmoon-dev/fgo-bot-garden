"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actionResult";
import { requireAuth } from "@/lib/auth/server";
import { safe } from "@/lib/safeAction";
import { db } from "@/lib/db";

const snapshotSchema = z.object({
  mode: z.enum(["narrative", "dialogue"]),
  backgroundId: z.string().nullable(),
  summary: z.string(),
  summarizedUntil: z.number().int(),
  cast: z.array(z.object({ characterId: z.string(), spriteSetId: z.string().nullable() })),
  messages: z.array(
    z.object({
      order: z.number().int(),
      role: z.enum(["user", "assistant"]),
      activeVariant: z.number().int(),
      variants: z.array(z.string()),
    }),
  ),
});

export async function createSession(characterId: string): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const character = await db.character.findUniqueOrThrow({ where: { id: characterId } });
    const session = await db.session.create({
      data: {
        title: `${character.name} — ${new Date().toLocaleDateString("en-GB")}`,
        mainCharacterId: character.id,
        backgroundId: character.defaultBackgroundId,
        cast: { create: [{ characterId: character.id, spriteSetId: character.defaultSpriteSetId }] },
        messages: character.greeting.trim()
          ? { create: [{ order: 0, role: "assistant", variants: { create: [{ position: 0, content: character.greeting }] } }] }
          : undefined,
      },
    });
    revalidatePath("/");
    return session.id;
  });
}

const sessionPatch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  mode: z.enum(["narrative", "dialogue"]).optional(),
  backgroundId: z.string().nullable().optional(),
});

export async function updateSession(id: string, patch: z.infer<typeof sessionPatch>): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.session.update({ where: { id }, data: sessionPatch.parse(patch) });
    revalidatePath(`/play/${id}`);
  });
}

export async function setCast(
  sessionId: string,
  cast: { characterId: string; spriteSetId: string | null }[],
): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const session = await db.session.findUniqueOrThrow({ where: { id: sessionId } });
    const list = z.array(z.object({ characterId: z.string(), spriteSetId: z.string().nullable() })).max(12).parse(cast);
    if (!list.some((c) => c.characterId === session.mainCharacterId)) {
      throw new Error("The main character must stay in the cast");
    }
    await db.$transaction([
      db.sessionCast.deleteMany({ where: { sessionId } }),
      db.sessionCast.createMany({ data: list.map((c) => ({ ...c, sessionId })) }),
    ]);
    revalidatePath(`/play/${sessionId}`);
  });
}

export async function deleteSession(id: string): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.session.delete({ where: { id } });
    revalidatePath("/");
  });
}

export async function editMessage(messageId: string, content: string): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const text = z.string().max(40000).parse(content);
    const message = await db.message.findUniqueOrThrow({
      where: { id: messageId },
      include: { variants: { orderBy: { position: "asc" } } },
    });
    const variant = message.variants[message.activeVariant] ?? message.variants.at(-1);
    if (!variant) throw new Error("Message has no content");
    await db.messageVariant.update({ where: { id: variant.id }, data: { content: text } });
  });
}

export async function deleteMessage(messageId: string): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.message.delete({ where: { id: messageId } });
  });
}

export async function setActiveVariant(messageId: string, index: number): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const count = await db.messageVariant.count({ where: { messageId } });
    if (index < 0 || index >= count) throw new Error("No such variant");
    await db.message.update({ where: { id: messageId }, data: { activeVariant: index } });
  });
}

export async function saveToSlot(sessionId: string, slot: number, label: string): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const n = z.number().int().min(1).max(10).parse(slot);
    const session = await db.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        cast: true,
        messages: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], include: { variants: { orderBy: { position: "asc" } } } },
      },
    });
    const snapshot: z.infer<typeof snapshotSchema> = {
      mode: session.mode as "narrative" | "dialogue",
      backgroundId: session.backgroundId,
      summary: session.summary,
      summarizedUntil: session.summarizedUntil,
      cast: session.cast.map((c) => ({ characterId: c.characterId, spriteSetId: c.spriteSetId })),
      messages: session.messages.map((m) => ({
        order: m.order,
        role: m.role as "user" | "assistant",
        activeVariant: m.activeVariant,
        variants: m.variants.map((v) => v.content),
      })),
    };
    const data = { label: z.string().max(80).parse(label), snapshot, createdAt: new Date() };
    await db.saveSlot.upsert({
      where: { sessionId_slot: { sessionId, slot: n } },
      update: data,
      create: { ...data, sessionId, slot: n },
    });
  });
}

export async function loadSlot(sessionId: string, slot: number): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const save = await db.saveSlot.findUniqueOrThrow({ where: { sessionId_slot: { sessionId, slot } } });
    const snap = snapshotSchema.parse(save.snapshot);
    // Characters deleted since the save are dropped from the cast.
    const existing = new Set(
      (await db.character.findMany({ where: { id: { in: snap.cast.map((c) => c.characterId) } }, select: { id: true } })).map(
        (c) => c.id,
      ),
    );
    await db.$transaction(async (tx) => {
      await tx.message.deleteMany({ where: { sessionId } });
      await tx.sessionCast.deleteMany({ where: { sessionId } });
      await tx.session.update({
        where: { id: sessionId },
        data: {
          mode: snap.mode,
          backgroundId: snap.backgroundId,
          summary: snap.summary,
          summarizedUntil: snap.summarizedUntil,
        },
      });
      await tx.sessionCast.createMany({
        data: snap.cast.filter((c) => existing.has(c.characterId)).map((c) => ({ ...c, sessionId })),
      });
      for (const m of snap.messages) {
        await tx.message.create({
          data: {
            sessionId,
            order: m.order,
            role: m.role,
            activeVariant: m.activeVariant,
            variants: { create: m.variants.map((content, position) => ({ position, content })) },
          },
        });
      }
    });
    revalidatePath(`/play/${sessionId}`);
  });
}

export async function deleteSlot(sessionId: string, slot: number): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.saveSlot.delete({ where: { sessionId_slot: { sessionId, slot } } });
  });
}
