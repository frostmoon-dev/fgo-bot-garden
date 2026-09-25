"use client";

import { unwrap } from "@/lib/actionResult";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCharacter, importCharacter } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";

export function CharacterListActions() {
  const router = useRouter();
  const [name, setName] = useState("");
  const { pending, error, run } = useAsync();

  return (
    <div className="panel flex flex-wrap items-end gap-3 rounded-lg p-4">
      <form
        className="flex flex-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const id = unwrap(await createCharacter(name));
            router.push(`/characters/${id}`);
          });
        }}
      >
        <input className="field" placeholder="New bot name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
          Create
        </Button>
      </form>
      <label className="cursor-pointer rounded-md border border-night-3 px-3 py-1.5 text-sm hover:border-gold-dim">
        Import JSON
        <input
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            run(async () => {
              let json: unknown;
              try {
                json = JSON.parse(await file.text());
              } catch {
                throw new Error("That file is not valid JSON.");
              }
              const id = unwrap(await importCharacter(json));
              router.push(`/characters/${id}`);
            });
          }}
        />
      </label>
      <ErrorText error={error} />
    </div>
  );
}
