"use server";

import type { ActionResult } from "@/lib/actionResult";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { listCharacters } from "@/lib/data/queries";
import { safe } from "@/lib/safeAction";

export interface PaletteData {
  stories: { id: string; title: string; characterName: string }[];
  characters: { id: string; name: string; ascensions: { id: string; name: string }[] }[];
}

// Everything the Ctrl+K palette can jump to.
export async function paletteData(): Promise<ActionResult<PaletteData>> {
  return safe(async () => {
    await requireAuth();
    const [characters, stories] = await Promise.all([
      listCharacters(),
      db.session.findMany({
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: { id: true, title: true, mainCharacter: { select: { name: true } } },
      }),
    ]);
    return {
      stories: stories.map((s) => ({ id: s.id, title: s.title, characterName: s.mainCharacter.name })),
      characters: characters.map((c) => ({ id: c.id, name: c.name, ascensions: c.spriteSets.map((s) => ({ id: s.id, name: s.name })) })),
    };
  });
}
