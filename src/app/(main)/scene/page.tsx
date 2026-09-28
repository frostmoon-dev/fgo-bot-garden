import Link from "next/link";
import { SceneWriter } from "@/components/home/SceneWriter";
import { getPersona, listBackgrounds, listCharacters } from "@/lib/data/queries";

export default async function ScenePage() {
  const [characters, backgrounds, persona] = await Promise.all([listCharacters(), listBackgrounds(), getPersona()]);
  return (
    <>
      <Link href="/" className="inline-flex min-h-10 items-center text-sm text-muted hover:text-ink">
        ← Home
      </Link>
      <header className="mb-8 mt-2 max-w-2xl sm:mb-10">
        <h1 className="page-title">Write a scene</h1>
        <p className="mt-3 max-w-xl text-muted">
          Describe where your story starts and choose who is in it. Write a few words or a whole page: the AI can finish it for you.
        </p>
      </header>
      <SceneWriter characters={characters} backgrounds={backgrounds} userName={persona.name} />
    </>
  );
}
