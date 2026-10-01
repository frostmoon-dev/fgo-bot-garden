"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actionResult";
import { requireAuth } from "@/lib/auth/server";
import { safe } from "@/lib/safeAction";
import { db } from "@/lib/db";
import { pickAscension, pickProfile, resolveProfile } from "@/lib/ascension";
import { cleanScene, normalizeScene, parseScene } from "@/lib/scene";
import { completeChat } from "@/lib/llm/client";
import { aboutUser, scenePrompt } from "@/lib/prompt/rules";
import { applyMacros } from "@/lib/stage/beats";
import { getPersona } from "@/lib/data/queries";
import { formChangeLine, readFormChange } from "@/lib/story/formChange";
import { withoutPresent } from "@/lib/story/formerCast";
import type { MessageView } from "@/lib/types";

const snapshotSchema = z.object({
  mode: z.enum(["narrative", "dialogue"]),
  backgroundId: z.string().nullable(),
  summary: z.string(),
  summarizedUntil: z.number().int(),
  // Older saves have no memory, scene or pins.
  memory: z.string().default(""),
  scene: z.string().default(""),
  cast: z.array(z.object({ characterId: z.string(), spriteSetId: z.string().nullable() })),
  messages: z.array(
    z.object({
      order: z.number().int(),
      role: z.enum(["user", "assistant"]),
      activeVariant: z.number().int(),
      pinned: z.boolean().default(false),
      variants: z.array(z.string()),
    }),
  ),
});

async function ascensionProfile(characterId: string, spriteSetId: string | null) {
  const [character, persona] = await Promise.all([
    db.character.findUniqueOrThrow({ where: { id: characterId }, include: { spriteSets: true } }),
    getPersona(),
  ]);
  const set = pickAscension(character, spriteSetId);
  const profile = resolveProfile(pickProfile(character), set);
  // The scene box shows text as is, so its {{user}} and {{char}} are filled in now.
  const openingScene = normalizeScene(applyMacros(profile.openingScene, { user: persona.name, char: character.name }));
  return { character, set, profile, openingScene };
}

// A fresh story: the ascension's greeting and opening scene. `setup` carries over another story's
// cast, mode and starting background, for "New story" from inside a story.
async function startStory(
  characterId: string,
  spriteSetId: string | null,
  setup?: {
    cast: { characterId: string; spriteSetId: string | null }[];
    mode: string;
    backgroundId: string | null;
    premise?: string;
  },
): Promise<string> {
  // A story that began from a written scene starts from that scene again, without a greeting.
  if (setup?.premise) return createPremiseStory({ ...setup, premise: setup.premise, mainCharacterId: characterId });
  const { character, set, profile, openingScene } = await ascensionProfile(characterId, spriteSetId);
  const titleName = set && character.spriteSets.length > 1 ? `${character.name} (${set.name})` : character.name;
  const others = (setup?.cast ?? []).filter((c) => c.characterId !== character.id);
  const session = await db.session.create({
    data: {
      title: `${titleName} — ${new Date().toLocaleDateString("en-GB")}`,
      mainCharacterId: character.id,
      mode: setup?.mode ?? "narrative",
      backgroundId: setup ? setup.backgroundId : character.defaultBackgroundId,
      scene: openingScene,
      cast: { create: [{ characterId: character.id, spriteSetId: set?.id ?? null }, ...others] },
      messages: profile.greeting.trim()
        ? { create: [{ order: 0, role: "assistant", variants: { create: [{ position: 0, content: profile.greeting }] } }] }
        : undefined,
    },
  });
  revalidatePath("/");
  return session.id;
}

// Starts a story with one ascension of a character: its greeting, opening scene and sprites.
export async function createSession(characterId: string, spriteSetId: string | null = null): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    return startStory(characterId, spriteSetId);
  });
}

// "New story" inside a story: same character, form, cast and mode, from the greeting again.
// The current story is left as it is.
export async function restartStory(sessionId: string): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const session = await db.session.findUniqueOrThrow({
      where: { id: sessionId },
      select: {
        mainCharacterId: true,
        mode: true,
        backgroundId: true,
        premise: true,
        cast: { select: { characterId: true, spriteSetId: true } },
      },
    });
    const main = session.cast.find((c) => c.characterId === session.mainCharacterId);
    return startStory(session.mainCharacterId, main?.spriteSetId ?? null, session);
  });
}

async function createPremiseStory(input: {
  premise: string;
  cast: { characterId: string; spriteSetId: string | null }[];
  mainCharacterId: string;
  mode: string;
  backgroundId: string | null;
}): Promise<string> {
  const characters = await db.character.findMany({
    where: { id: { in: input.cast.map((c) => c.characterId) } },
    select: { id: true, name: true },
  });
  const names = input.cast.flatMap((c) => characters.find((ch) => ch.id === c.characterId)?.name ?? []);
  const scene = await sceneBoxFor(input.premise, names);
  const place = parseScene(scene).Location;
  const session = await db.session.create({
    data: {
      title: `${names.join(", ")} — ${place && place.length <= 40 ? place : new Date().toLocaleDateString("en-GB")}`.slice(0, 120),
      mainCharacterId: input.mainCharacterId,
      mode: input.mode,
      backgroundId: input.backgroundId,
      premise: input.premise,
      scene,
      // Characters deleted since a restart's story began are left out.
      cast: { create: input.cast.filter((c) => characters.some((ch) => ch.id === c.characterId)) },
    },
  });
  revalidatePath("/");
  return session.id;
}

const sceneStorySchema = z.object({
  premise: z.string().trim().min(1, "Write the scene first").max(6000),
  cast: z
    .array(z.object({ characterId: z.string(), spriteSetId: z.string().nullable() }))
    .min(1, "Choose at least one character")
    .max(12),
  mainCharacterId: z.string(),
  mode: z.enum(["narrative", "dialogue"]),
  backgroundId: z.string().nullable(),
});
export type SceneStoryInput = z.infer<typeof sceneStorySchema>;

// The scene box for a written scene. One short model call; if it fails, the scene text itself is the Situation.
async function sceneBoxFor(premise: string, names: string[]): Promise<string> {
  const persona = await getPersona();
  try {
    const text = await completeChat({
      messages: [
        { role: "system", content: scenePrompt(persona.name) },
        {
          role: "user",
          content: `${aboutUser(persona, 400)}\n\nCharacters in the story: ${names.join(", ")}.\n\nCurrent scene:\n(not set yet)\n\nHow the story begins:\n${premise}`,
        },
      ],
      temperature: 0.2,
      maxTokens: 220,
      // The story is waiting to start; without an answer soon, the scene text itself is used.
      deadline: Date.now() + 20_000,
    });
    const scene = cleanScene(text);
    if (scene) return scene;
  } catch {
    // The story still starts; the scene box fills in after the first reply.
  }
  return normalizeScene(premise.length > 300 ? `${premise.slice(0, 300)}…` : premise);
}

// "Write a scene": a story that starts from the player's own scene and cast, instead of a character's greeting.
export async function createSceneStory(input: SceneStoryInput): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const data = sceneStorySchema.parse(input);
    if (!data.cast.some((c) => c.characterId === data.mainCharacterId)) {
      throw new Error("The main character must be in the scene");
    }
    const characters = await db.character.findMany({
      where: { id: { in: data.cast.map((c) => c.characterId) } },
      select: { id: true, defaultBackgroundId: true },
    });
    if (characters.length !== data.cast.length) throw new Error("One of the characters no longer exists");
    // No background chosen: the main character's own.
    const backgroundId = data.backgroundId ?? characters.find((c) => c.id === data.mainCharacterId)?.defaultBackgroundId ?? null;
    // The main character goes first, so they stand at the center of the cast list.
    const cast = [...data.cast].sort((a, b) => Number(b.characterId === data.mainCharacterId) - Number(a.characterId === data.mainCharacterId));
    return createPremiseStory({ ...data, cast, backgroundId });
  });
}

// "Branch from here": a new story with everything up to and including one message, to try another way
// forward. The original story is left as it is.
export async function branchStory(sessionId: string, messageId: string): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const session = await db.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        cast: true,
        messages: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], include: { variants: { orderBy: { position: "asc" } } } },
      },
    });
    const cut = session.messages.findIndex((m) => m.id === z.string().parse(messageId));
    if (cut < 0) throw new Error("That message is no longer in the story");
    const kept = session.messages.slice(0, cut + 1);
    const cutOrder = kept.at(-1)!.order;
    const atEnd = cut === session.messages.length - 1;
    // A summary that already covers later messages would tell the AI what hasn't happened in the branch yet.
    // Then the branch starts without it, and the full history is sent until it is summarized again.
    const summaryFits = session.summarizedUntil <= cutOrder;
    const created = await db.session.create({
      data: {
        title: `${session.title} (branch)`.slice(0, 120),
        mainCharacterId: session.mainCharacterId,
        mode: session.mode,
        backgroundId: session.backgroundId,
        premise: session.premise,
        memory: session.memory,
        summary: summaryFits ? session.summary : "",
        summarizedUntil: summaryFits ? session.summarizedUntil : -1,
        // The characters already remember these messages; don't fold them into their memories twice.
        rememberedUntil: Math.min(session.rememberedUntil, cutOrder),
        scene: atEnd ? session.scene : "",
        cast: { create: session.cast.map(({ characterId, spriteSetId }) => ({ characterId, spriteSetId })) },
        messages: {
          create: kept.map((m) => ({
            order: m.order,
            role: m.role,
            activeVariant: m.activeVariant,
            pinned: m.pinned,
            variants: { create: m.variants.map(({ position, content }) => ({ position, content })) },
          })),
        },
      },
    });
    revalidatePath("/");
    return created.id;
  });
}

export interface AscensionSwitch {
  // The story's first message, now showing the new ascension's greeting. Null if it did not change.
  firstMessage: MessageView | null;
  // The new opening scene, only while the story has not started yet.
  scene: string | null;
  // In a running story: the "changes form" line added at the end (or rewritten, when switched again).
  formChange: MessageView | null;
}

// Changes a cast member's ascension. For the main character the greeting follows: the first message
// gets the new ascension's greeting as a version (earlier versions stay, so switching back restores them).
export async function switchAscension(
  sessionId: string,
  characterId: string,
  spriteSetId: string | null,
): Promise<ActionResult<AscensionSwitch>> {
  return safe(async () => {
    await requireAuth();
    const session = await db.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: { id: true, order: true, role: true, activeVariant: true, pinned: true, variants: { orderBy: { position: "asc" } } },
        },
      },
    });
    await db.sessionCast.update({
      where: { sessionId_characterId: { sessionId, characterId } },
      data: { spriteSetId: z.string().nullable().parse(spriteSetId) },
    });
    revalidatePath(`/play/${sessionId}`);
    const { character, set, profile, openingScene } = await ascensionProfile(characterId, spriteSetId);
    const started = session.messages.some((m) => m.role === "user");

    // Mid-story, the change becomes part of the story, so the characters know it happened.
    if (started) {
      if (!set) return { firstMessage: null, scene: null, formChange: null };
      const line = formChangeLine(character.name, set.name);
      const last = session.messages.at(-1)!;
      const lastVariant = last.variants[last.activeVariant] ?? last.variants.at(-1);
      // Switched again before anyone spoke: rewrite that line instead of adding another.
      if (last.role === "assistant" && lastVariant && readFormChange(lastVariant.content)?.name === character.name) {
        await db.messageVariant.update({ where: { id: lastVariant.id }, data: { content: line } });
        const variants = last.variants.map((v) => ({ id: v.id, content: v.id === lastVariant.id ? line : v.content }));
        return { firstMessage: null, scene: null, formChange: { id: last.id, order: last.order, role: "assistant", activeVariant: last.activeVariant, pinned: last.pinned, variants } };
      }
      const order = last.order + 1;
      const created = await db.message.create({
        data: { sessionId, order, role: "assistant", variants: { create: [{ position: 0, content: line }] } },
        include: { variants: true },
      });
      await db.session.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
      return {
        firstMessage: null,
        scene: null,
        formChange: { id: created.id, order, role: "assistant", activeVariant: 0, pinned: false, variants: created.variants.map(({ id, content }) => ({ id, content })) },
      };
    }

    if (characterId !== session.mainCharacterId) return { firstMessage: null, scene: null, formChange: null };
    let scene: string | null = null;
    if (!started && openingScene) {
      scene = openingScene;
      await db.session.update({ where: { id: sessionId }, data: { scene } });
    }

    const greeting = profile.greeting.trim() ? profile.greeting : "";
    const first = session.messages[0];
    if (!greeting) return { firstMessage: null, scene, formChange: null };

    if (!first || first.role !== "assistant") {
      // No greeting yet: add one before everything else.
      const order = (first?.order ?? 1) - 1;
      const created = await db.message.create({
        data: { sessionId, order, role: "assistant", variants: { create: [{ position: 0, content: greeting }] } },
        include: { variants: true },
      });
      return {
        firstMessage: { id: created.id, order, role: "assistant", activeVariant: 0, pinned: false, variants: created.variants.map(({ id, content }) => ({ id, content })) },
        scene,
        formChange: null,
      };
    }

    let variants = first.variants;
    let activeVariant = variants.findIndex((v) => v.content === greeting);
    if (activeVariant < 0) {
      const created = await db.messageVariant.create({
        data: { messageId: first.id, position: (variants.at(-1)?.position ?? -1) + 1, content: greeting },
      });
      variants = [...variants, created];
      activeVariant = variants.length - 1;
    }
    if (activeVariant !== first.activeVariant) {
      await db.message.update({ where: { id: first.id }, data: { activeVariant } });
    }
    return {
      firstMessage: {
        id: first.id,
        order: first.order,
        role: "assistant",
        activeVariant,
        pinned: first.pinned,
        variants: variants.map(({ id, content }) => ({ id, content })),
      },
      scene,
      formChange: null,
    };
  });
}

const sessionPatch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  mode: z.enum(["narrative", "dialogue"]).optional(),
  backgroundId: z.string().nullable().optional(),
  memory: z.string().max(4000).optional(),
  summary: z.string().max(8000).optional(),
  scene: z.string().max(2000).optional(),
});
export type SessionPatch = z.infer<typeof sessionPatch>;

export async function updateSession(id: string, patch: SessionPatch): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.session.update({ where: { id }, data: sessionPatch.parse(patch) });
    revalidatePath(`/play/${id}`);
  });
}

export async function setCast(
  sessionId: string,
  cast: { characterId: string; spriteSetId: string | null }[],
): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const session = await db.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: { cast: { include: { character: { select: { id: true, name: true, aliases: true } } } } },
    });
    const list = z.array(z.object({ characterId: z.string(), spriteSetId: z.string().nullable() })).max(12).parse(cast);
    if (!list.some((c) => c.characterId === session.mainCharacterId)) {
      throw new Error("The main character must stay in the cast");
    }
    // Whoever leaves the cast leaves the scene box too, so the next reply doesn't bring them back.
    const kept = new Set(list.map((c) => c.characterId));
    const scene = withoutPresent(session.scene, session.cast.filter((c) => !kept.has(c.characterId)).map((c) => c.character));
    await db.$transaction([
      db.sessionCast.deleteMany({ where: { sessionId } }),
      db.sessionCast.createMany({ data: list.map((c) => ({ ...c, sessionId })) }),
      db.session.update({ where: { id: sessionId }, data: { scene } }),
    ]);
    revalidatePath(`/play/${sessionId}`);
    return scene;
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

export async function setPinned(messageId: string, pinned: boolean): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.message.update({ where: { id: messageId }, data: { pinned: z.boolean().parse(pinned) } });
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
      memory: session.memory,
      scene: session.scene,
      cast: session.cast.map((c) => ({ characterId: c.characterId, spriteSetId: c.spriteSetId })),
      messages: session.messages.map((m) => ({
        order: m.order,
        role: m.role as "user" | "assistant",
        activeVariant: m.activeVariant,
        pinned: m.pinned,
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
    // The characters' memories already hold the restored messages (or some of them). Messages written
    // after loading reuse later positions, so the memory mark must not stay past the restored story.
    const { rememberedUntil } = await db.session.findUniqueOrThrow({ where: { id: sessionId }, select: { rememberedUntil: true } });
    const lastOrder = Math.max(-1, ...snap.messages.map((m) => m.order));
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
          memory: snap.memory,
          scene: snap.scene,
          rememberedUntil: Math.min(rememberedUntil, lastOrder),
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
            pinned: m.pinned,
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
