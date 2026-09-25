"use client";

import { unwrap } from "@/lib/actionResult";
import { useRouter } from "next/navigation";
import { deleteCharacter, duplicateCharacter, exportCharacter } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import type { CharacterView } from "@/lib/types";

export function ManageTab({ character }: { character: CharacterView }) {
  const router = useRouter();
  const { pending, error, run } = useAsync();

  const download = () =>
    run(async () => {
      const data = unwrap(await exportCharacter(character.id));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${character.name.replace(/[^\w-]+/g, "_")}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="font-display text-gold">Export</h3>
        <p className="text-sm text-ink-dim">
          Saves the profile, expressions and sprite set settings as JSON. Sprite images are linked by URL, not copied into the file.
        </p>
        <Button onClick={download} disabled={pending}>
          Download JSON
        </Button>
      </section>
      <section className="space-y-2">
        <h3 className="font-display text-gold">Duplicate</h3>
        <Button
          disabled={pending}
          onClick={() =>
            run(async () => {
              const id = unwrap(await duplicateCharacter(character.id));
              router.push(`/characters/${id}`);
            })
          }
        >
          Make a copy
        </Button>
      </section>
      <section className="space-y-2">
        <h3 className="font-display text-danger">Delete</h3>
        <p className="text-sm text-ink-dim">Also deletes every session where this bot is the main character.</p>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete ${character.name} and their sessions? This cannot be undone.`)) return;
            run(async () => {
              unwrap(await deleteCharacter(character.id));
              router.push("/characters");
            });
          }}
        >
          Delete {character.name}
        </Button>
      </section>
      <ErrorText error={error} />
    </div>
  );
}
