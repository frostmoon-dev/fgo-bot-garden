import { LoreManager } from "@/components/library/LoreManager";
import { PageHeader } from "@/components/ui/PageHeader";
import { db } from "@/lib/db";

export default async function LorebookPage() {
  const entries = await db.lorebookEntry.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="Lorebook" description="World facts. An entry is added to the prompt when one of its keywords appears in recent messages." />
      <LoreManager entries={entries} />
    </>
  );
}
