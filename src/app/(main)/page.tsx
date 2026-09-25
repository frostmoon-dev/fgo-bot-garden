import { CharacterGallery } from "@/components/home/CharacterGallery";
import { SessionList } from "@/components/home/SessionList";
import { listCharacters, listSessions } from "@/lib/data/queries";

export default async function HomePage() {
  const [characters, sessions] = await Promise.all([listCharacters(), listSessions()]);
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="font-display text-2xl text-gold">Choose a Servant</h1>
        <CharacterGallery characters={characters} />
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl text-gold">Continue</h2>
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
    </div>
  );
}
