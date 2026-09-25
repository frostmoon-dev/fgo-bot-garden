import Link from "next/link";
import { CharacterListActions } from "@/components/editor/CharacterListActions";
import { Portrait } from "@/components/home/Portrait";
import { ColorDot } from "@/components/ui/ColorDot";
import { PageHeader } from "@/components/ui/PageHeader";
import { listCharacters } from "@/lib/data/queries";

export default async function CharactersPage() {
  const characters = await listCharacters();
  return (
    <>
      <PageHeader title="Characters" description="Create bots, edit their definitions and set up their sprite sheets." />
      <CharacterListActions />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((c) => (
          <li key={c.id}>
            <Link href={`/characters/${c.id}`} className="card flex items-center gap-4 p-4 transition-colors hover:border-muted">
              <Portrait character={c} className="size-16 shrink-0 rounded-lg" />
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold">
                  <ColorDot color={c.color} />
                  <span className="truncate">{c.name}</span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  {c.expressions.length} expressions · {c.spriteSets.length} sprite {c.spriteSets.length === 1 ? "sheet" : "sheets"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
