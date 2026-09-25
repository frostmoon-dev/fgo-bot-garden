"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSession } from "@/app/actions/sessions";
import { ColorDot } from "@/components/ui/ColorDot";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import type { CharacterView } from "@/lib/types";
import { Portrait } from "./Portrait";

export function CharacterGallery({ characters }: { characters: CharacterView[] }) {
  const router = useRouter();
  const { pending, error, run } = useAsync();

  function start(id: string) {
    run(async () => {
      const sessionId = unwrap(await createSession(id));
      router.push(`/play/${sessionId}`);
    });
  }

  if (!characters.length) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="font-medium">No bots yet</p>
        <p className="mt-1 text-sm text-muted">Create one and give it an FGO sprite sheet.</p>
        <Link href="/characters" className="mt-6 inline-flex min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent">
          Create a bot
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ErrorText error={error} />
      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {characters.map((c) => (
          <li key={c.id} className="card group overflow-hidden">
            <button
              type="button"
              disabled={pending}
              onClick={() => start(c.id)}
              className="block w-full text-left disabled:opacity-60"
              aria-label={`Start a new story with ${c.name}`}
            >
              <Portrait character={c} className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.03]" />
            </button>
            <div className="p-4">
              <p className="flex items-center gap-2 font-semibold">
                <ColorDot color={c.color} />
                <span className="truncate">{c.name}</span>
              </p>
              <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted">{c.description || "No description yet."}</p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(c.id)}
                  className="min-h-10 flex-1 rounded-lg bg-accent px-3 text-sm font-semibold text-on-accent disabled:opacity-40"
                >
                  Start
                </button>
                <Link href={`/characters/${c.id}`} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm text-muted hover:bg-raised hover:text-ink">
                  Edit
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
