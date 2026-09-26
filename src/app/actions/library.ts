"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actionResult";
import { isFontId, isThemeId } from "@/lib/appearance";
import { requireAuth } from "@/lib/auth/server";
import { safe } from "@/lib/safeAction";
import { db } from "@/lib/db";
import { invalidate, TAGS } from "@/lib/data/cache";

// Backgrounds, persona, lorebook and settings.

const backgroundSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, _ or -"),
  label: z.string().max(120),
  imageUrl: z.string().trim().min(1).max(2000),
  description: z.string().max(1000),
});
export type BackgroundInput = z.infer<typeof backgroundSchema>;

export async function saveBackground(id: string | null, input: BackgroundInput): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const data = backgroundSchema.parse(input);
    if (id) await db.background.update({ where: { id }, data });
    else await db.background.create({ data });
    invalidate(TAGS.backgrounds);
    revalidatePath("/backgrounds");
  });
}

export async function deleteBackground(id: string): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.character.updateMany({ where: { defaultBackgroundId: id }, data: { defaultBackgroundId: null } });
    await db.session.updateMany({ where: { backgroundId: id }, data: { backgroundId: null } });
    await db.background.delete({ where: { id } });
    invalidate(TAGS.backgrounds, TAGS.characters);
    revalidatePath("/backgrounds");
  });
}

const personaSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(5000),
  addressAs: z.string().max(80),
  role: z.string().max(300),
});

export async function savePersona(input: z.infer<typeof personaSchema>): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const data = personaSchema.parse(input);
    await db.persona.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    invalidate(TAGS.persona);
    revalidatePath("/persona");
  });
}

const loreSchema = z.object({
  title: z.string().max(120),
  keywords: z.array(z.string().trim().min(1).max(80)).min(1, "Add at least one keyword").max(50),
  content: z.string().trim().min(1).max(10000),
  enabled: z.boolean(),
});
export type LoreInput = z.infer<typeof loreSchema>;

export async function saveLore(id: string | null, input: LoreInput): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const data = loreSchema.parse(input);
    if (id) await db.lorebookEntry.update({ where: { id }, data });
    else await db.lorebookEntry.create({ data });
    invalidate(TAGS.lore);
    revalidatePath("/lorebook");
  });
}

export async function deleteLore(id: string): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.lorebookEntry.delete({ where: { id } });
    invalidate(TAGS.lore);
    revalidatePath("/lorebook");
  });
}

// Drops every cached list, so changes made outside the app (the Supabase dashboard, scripts) show at once.
export async function reloadData(): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    invalidate(...Object.values(TAGS));
    revalidatePath("/", "layout");
  });
}

const settingsSchema = z.object({
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(50).max(8000),
  textSpeed: z.number().int().min(5).max(500),
  autoSpeed: z.number().int().min(200).max(10000),
  uiScale: z.number().min(0.7).max(1.6),
  windowOpacity: z.number().min(0.3).max(1),
  loreScanDepth: z.number().int().min(1).max(20),
  contextBudget: z.number().int().min(1000).max(100000),
  keepRecent: z.number().int().min(2).max(100),
  devMode: z.boolean(),
  theme: z.string().refine(isThemeId, "Unknown theme"),
  customBg: z.string().regex(/^(#[0-9a-fA-F]{6})?$/),
  font: z.string().refine(isFontId, "Unknown font"),
  narrationStyle: z.enum(["italic", "plain"]),
  frameStyle: z.enum(["fgo", "simple"]),
  promptProfile: z.enum(["balanced", "compact", "strict"]),
  contextSize: z.number().int().min(2048).max(2_000_000),
  topP: z.number().min(0.01).max(1),
  frequencyPenalty: z.number().min(-2).max(2),
  presencePenalty: z.number().min(-2).max(2),
  memoryPlacement: z.enum(["end", "top"]),
  exampleMode: z.enum(["auto", "always", "never"]),
  formatReminder: z.boolean(),
  stopAtUser: z.boolean(),
  customPrompt: z.string().max(8000),
  sceneTracker: z.boolean(),
  autoChoices: z.boolean(),
  characterMemory: z.boolean(),
  replyLength: z.enum(["short", "scene", "long"]),
});
export type SettingsInput = z.input<typeof settingsSchema>;

export async function saveSettings(input: SettingsInput): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    const data = settingsSchema.parse(input);
    await db.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    invalidate(TAGS.settings);
    revalidatePath("/", "layout");
  });
}
