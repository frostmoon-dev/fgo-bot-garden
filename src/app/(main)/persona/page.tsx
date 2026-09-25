import { PersonaForm } from "@/components/library/PersonaForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPersona } from "@/lib/data/queries";

export default async function PersonaPage() {
  const persona = await getPersona();
  return (
    <>
      <PageHeader title="Your persona" description="Who you are in the story. The AI never writes lines for this character." />
      <PersonaForm persona={persona} />
    </>
  );
}
