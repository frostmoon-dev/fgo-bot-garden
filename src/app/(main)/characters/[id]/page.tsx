import { notFound } from "next/navigation";
import { CharacterEditor } from "@/components/editor/CharacterEditor";
import { getBond, getCharacter, getMemories, getPersona, listBackgrounds } from "@/lib/data/queries";

export default async function CharacterPage({ params }: PageProps<"/characters/[id]">) {
  const { id } = await params;
  const [character, backgrounds, memories, persona, bond] = await Promise.all([
    getCharacter(id),
    listBackgrounds(),
    getMemories(id),
    getPersona(),
    getBond(id),
  ]);
  if (!character) notFound();
  return <CharacterEditor character={character} backgrounds={backgrounds} memories={memories} bond={bond} userName={persona.name} />;
}
