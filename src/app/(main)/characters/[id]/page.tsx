import { notFound } from "next/navigation";
import { CharacterEditor } from "@/components/editor/CharacterEditor";
import { getCharacter, listBackgrounds } from "@/lib/data/queries";

export default async function CharacterPage({ params }: PageProps<"/characters/[id]">) {
  const { id } = await params;
  const [character, backgrounds] = await Promise.all([getCharacter(id), listBackgrounds()]);
  if (!character) notFound();
  return <CharacterEditor character={character} backgrounds={backgrounds} />;
}
