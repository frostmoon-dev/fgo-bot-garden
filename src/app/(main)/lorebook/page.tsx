import { LoreManager } from "@/components/library/LoreManager";
import { db } from "@/lib/db";

export default async function LorebookPage() {
  const entries = await db.lorebookEntry.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">Lorebook</h1>
      <LoreManager entries={entries} />
    </div>
  );
}
