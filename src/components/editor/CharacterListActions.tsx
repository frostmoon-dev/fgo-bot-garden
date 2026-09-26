"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCharacter, importCharacter } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";

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
        <label className="btn btn-quiet cursor-pointer self-start">
          Import JSON…
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
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
      </div>
      <ErrorText error={error} />
    </div>
  );
}
