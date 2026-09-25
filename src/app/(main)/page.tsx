import { CharacterGallery } from "@/components/home/CharacterGallery";
import { SessionList } from "@/components/home/SessionList";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { listCharacters, listSessions } from "@/lib/data/queries";

export default async function HomePage() {
  const [characters, sessions] = await Promise.all([listCharacters(), listSessions()]);
  return (
    <>
      <PageHeader title="Choose a Servant" description="Start a new story, or continue one below." />
      <CharacterGallery characters={characters} />
      <section className="mt-16">
        <SectionTitle>Continue a story</SectionTitle>
        <SessionList
          sessions={sessions.map((s) => ({
            id: s.id,
            title: s.title,
            mode: s.mode,
            updatedAt: s.updatedAt.toISOString(),
            characterName: s.mainCharacter.name,
            color: s.mainCharacter.color,
            messageCount: s._count.messages,
          }))}
        />
      </section>
    </>
  );
}
