import "server-only";
import { db } from "@/lib/db";
import type { LoreProvider } from "./types";

export const localLoreProvider: LoreProvider = {
  async listEnabled() {
    return db.lorebookEntry.findMany({ where: { enabled: true }, orderBy: { createdAt: "asc" } });
  },
};
