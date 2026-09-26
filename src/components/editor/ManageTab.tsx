"use client";

import { unwrap } from "@/lib/actionResult";
import { useRouter } from "next/navigation";
import { deleteCharacter, duplicateCharacter, exportCharacter } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import type { CharacterView } from "@/lib/types";
import { askConfirm } from "@/components/ui/dialogs";

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
    <div className="max-w-2xl divide-y divide-line">
      <section className="space-y-3 pb-8">
        <h2 className="tab-heading">Export</h2>
        <p className="text-sm text-muted">
          Saves the profile, expressions and ascensions (definitions and sheet settings) as JSON. Sprite images are linked by URL, not copied into the file.
        </p>
        <Button onClick={download} disabled={pending}>
          Download JSON
        </Button>
      </section>
      <section className="space-y-3 py-8">
        <h2 className="tab-heading">Duplicate</h2>
        <p className="text-sm text-muted">Copies the profile, expressions and ascensions into a new bot.</p>
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
      <section className="space-y-3 pt-8">
        <h2 className="tab-heading">Delete</h2>
        <p className="text-sm text-muted">Also deletes every story where this bot is the main character.</p>
        <Button
          variant="danger"
          className="border border-danger/40"
          disabled={pending}
          onClick={async () => {
            const ok = await askConfirm({
              title: `Delete ${character.name}?`,
              body: `${character.name}, their ascensions and sprites, and every story where they are the main character will be deleted. Other stories keep going without them. This cannot be undone.`,
              confirmLabel: `Delete ${character.name}`,
              danger: true,
            });
            if (!ok) return;
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
