import { BackgroundManager } from "@/components/library/BackgroundManager";
import { listBackgrounds } from "@/lib/data/queries";

export default async function BackgroundsPage() {
  const backgrounds = await listBackgrounds();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">Backgrounds</h1>
      <BackgroundManager backgrounds={backgrounds} />
    </div>
  );
}
