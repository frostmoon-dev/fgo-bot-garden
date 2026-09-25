import Link from "next/link";
import { CharacterListActions } from "@/components/editor/CharacterListActions";
import { Portrait } from "@/components/home/Portrait";
import { listCharacters } from "@/lib/data/queries";

export default async function CharactersPage() {
  const characters = await listCharacters();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">Characters</h1>
      <CharacterListActions />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((c) => (
          <li key={c.id}>
            <Link href={`/characters/${c.id}`} className="panel flex items-center gap-3 rounded-lg p-3 hover:border-gold">
              <Portrait character={c} className="size-14 shrink-0 rounded" />
              <div className="min-w-0">
                <p className="font-display" style={{ color: c.color }}>
                  {c.name}
                </p>
                <p className="text-xs text-ink-dim">
                  {c.expressions.length} expressions · {c.spriteSets.length} sprite sets
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
