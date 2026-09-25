"use client";

import { unwrap } from "@/lib/actionResult";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSession } from "@/app/actions/sessions";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
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
      <div className="panel rounded-lg p-6 text-ink-dim">
        No bots yet.{" "}
        <Link href="/characters" className="text-gold underline">
          Create your first one
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ErrorText error={error} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {characters.map((c) => (
          <li key={c.id} className="panel flex flex-col overflow-hidden rounded-lg">
            <Portrait character={c} className="aspect-square w-full" />
            <div className="flex flex-1 flex-col gap-2 p-3">
              <p className="font-display text-base" style={{ color: c.color }}>
                {c.name}
              </p>
              <p className="line-clamp-2 flex-1 text-xs text-ink-dim">{c.description || "No description."}</p>
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1" disabled={pending} onClick={() => start(c.id)}>
                  Start
                </Button>
                <Link href={`/characters/${c.id}`} className="rounded-md border border-night-3 px-3 py-1.5 text-sm hover:border-gold-dim">
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
