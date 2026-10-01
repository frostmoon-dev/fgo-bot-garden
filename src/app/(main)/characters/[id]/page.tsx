import { notFound } from "next/navigation";
import { CharacterEditor } from "@/components/editor/CharacterEditor";
import { getBond, getCharacter, getMemories, getPersona, listBackgrounds, listInterludes } from "@/lib/data/queries";

export default async function CharacterPage({ params, searchParams }: PageProps<"/characters/[id]">) {
  const { id } = await params;
  const { tab } = await searchParams;
  const [character, backgrounds, memories, persona, bond, interludes] = await Promise.all([
    getCharacter(id),
    listBackgrounds(),
    getMemories(id),
    getPersona(),
    getBond(id),
    listInterludes(id),
  ]);
  if (!character) notFound();
  return (
    <CharacterEditor
      character={character}
      backgrounds={backgrounds}
      memories={memories}
      bond={bond}
      interludes={interludes}
      userName={persona.name}
      initialTab={tab === "bond" ? "Bond & memories" : undefined}
    />
  );
}
