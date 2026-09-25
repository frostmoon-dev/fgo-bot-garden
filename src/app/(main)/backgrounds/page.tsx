import { BackgroundManager } from "@/components/library/BackgroundManager";
import { PageHeader } from "@/components/ui/PageHeader";
import { listBackgrounds } from "@/lib/data/queries";

export default async function BackgroundsPage() {
  const backgrounds = await listBackgrounds();
  return (
    <>
      <PageHeader title="Backgrounds" description="Scenes the AI can switch to with {scene:id}. The description helps it choose." />
      <BackgroundManager backgrounds={backgrounds} />
    </>
  );
}
