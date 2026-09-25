import { notFound } from "next/navigation";
import { PlayClient } from "@/components/stage/PlayClient";
import { getPersona, getSession, getSettings, listBackgrounds, listCharacters } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: PageProps<"/play/[sessionId]">) {
  const { sessionId } = await params;
  const [session, characters, backgrounds, persona, settings] = await Promise.all([
    getSession(sessionId),
    listCharacters(),
    listBackgrounds(),
    getPersona(),
    getSettings(),
  ]);
  if (!session) notFound();
  return (
    <PlayClient
      key={session.id}
      data={{
        session,
        characters: Object.fromEntries(characters.map((c) => [c.id, c])),
        backgrounds,
        persona,
        settings,
      }}
    />
  );
}
