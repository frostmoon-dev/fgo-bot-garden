"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCharacter, importCharacter } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import { readCharacterFile } from "@/lib/tavernCard";

export function CharacterListActions() {
  const router = useRouter();
  const [name, setName] = useState("");
  const { pending, error, run } = useAsync();

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <form
          className="flex min-w-0 gap-2 sm:max-w-md sm:flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const id = unwrap(await createCharacter(name));
              router.push(`/characters/${id}`);
            });
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">New bot name</span>
            <input className="field" placeholder="New bot name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </label>
          <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
            Create
          </Button>
        </form>
        <label
          className="btn btn-quiet cursor-pointer self-start"
          title="A bot exported from this app, or a character card (PNG or JSON) from SillyTavern, JanitorAI exporters, Chub and similar sites"
        >
          Import…
          <input
            type="file"
            accept="application/json,.json,image/png,.png"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              run(async () => {
                // Character cards are turned into this app's format here, then saved like any import.
                const id = unwrap(await importCharacter(await readCharacterFile(file)));
                router.push(`/characters/${id}`);
              });
            }}
          />
        </label>
      </div>
      <p className="mt-2 text-sm text-muted">
        Import takes a bot exported from this app, or a character card (PNG or JSON) from SillyTavern, Chub or a JanitorAI
        exporter. Cards bring their text and lorebook; add sprites afterwards.
      </p>
      <ErrorText error={error} />
    </div>
  );
}
