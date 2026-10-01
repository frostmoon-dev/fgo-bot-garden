import { notFound } from "next/navigation";
import { PlayClient } from "@/components/stage/PlayClient";
import { getPersona, getSession, getSettings, listBackgrounds, listBonds, listCharacters } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params, searchParams }: PageProps<"/play/[sessionId]">) {
  const { sessionId } = await params;
  const { at } = await searchParams;
  const [session, characters, backgrounds, persona, settings, bonds] = await Promise.all([
    getSession(sessionId),
    listCharacters(),
    listBackgrounds(),
    getPersona(),
    getSettings(),
    listBonds(),
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
        bonds,
        focusMessageId: typeof at === "string" && session.messages.some((m) => m.id === at) ? at : null,
      }}
    />
  );
}
