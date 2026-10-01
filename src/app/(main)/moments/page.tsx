import { MomentGallery } from "@/components/moments/MomentGallery";
import { PageHeader } from "@/components/ui/PageHeader";
import { listMoments } from "@/lib/data/queries";

export default async function MomentsPage() {
  const moments = await listMoments();
  return (
    <>
      <PageHeader title="Moments" description="Lines you kept from your stories, like cards. In a story, press K or open Menu → Keep this moment." />
      <MomentGallery moments={moments} />
    </>
  );
}
