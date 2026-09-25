import { PersonaForm } from "@/components/library/PersonaForm";
import { getPersona } from "@/lib/data/queries";

export default async function PersonaPage() {
  const persona = await getPersona();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">Your persona</h1>
      <PersonaForm persona={persona} />
    </div>
  );
}
