import { notFound } from "next/navigation";
import { CharacterEditor } from "@/components/editor/CharacterEditor";
import { getCharacter, getMemories, getPersona, listBackgrounds } from "@/lib/data/queries";

export default async function CharacterPage({ params }: PageProps<"/characters/[id]">) {
  const { id } = await params;
  const [character, backgrounds, memories, persona] = await Promise.all([getCharacter(id), listBackgrounds(), getMemories(id), getPersona()]);
  if (!character) notFound();
  return <CharacterEditor character={character} backgrounds={backgrounds} memories={memories} userName={persona.name} />;
}
