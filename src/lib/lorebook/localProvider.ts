import "server-only";
import { listEnabledLore } from "@/lib/data/queries";
import type { LoreProvider } from "./types";

export const localLoreProvider: LoreProvider = {
  listEnabled: () => listEnabledLore(),
};
