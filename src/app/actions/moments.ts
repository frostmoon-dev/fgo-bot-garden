"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actionResult";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { momentInputSchema, type MomentInput } from "@/lib/moment";
import { safe } from "@/lib/safeAction";

export async function saveMoment(input: MomentInput): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const data = momentInputSchema.parse(input);
    const row = await db.moment.create({ data: { ...data, sprite: data.sprite ?? undefined } });
    revalidatePath("/moments");
    return row.id;
  });
}

export async function deleteMoment(id: string): Promise<ActionResult<void>> {
  return safe(async () => {
    await requireAuth();
    await db.moment.delete({ where: { id: z.string().parse(id) } });
    revalidatePath("/moments");
  });
}
