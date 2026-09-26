import "server-only";
import { revalidateTag } from "next/cache";

// Data that changes only when the user edits it is cached across requests.
// The database is a network round trip away, so this is most of the page speed.
export const TAGS = {
  characters: "characters",
  backgrounds: "backgrounds",
  persona: "persona",
  settings: "settings",
  lore: "lore",
  connection: "connection",
} as const;

export type CacheTag = (typeof TAGS)[keyof typeof TAGS];

// Call after a write. Expires at once, so the next read sees the change.
export function invalidate(...tags: CacheTag[]) {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}
