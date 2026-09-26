"use client";

import { useState } from "react";
import { saveCharacterMemories } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { askConfirm } from "@/components/ui/dialogs";
import { ErrorText } from "@/components/ui/ErrorText";
import { TextArea } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import type { CharacterView } from "@/lib/types";

// What the character remembers about the user across stories. Written in the background as stories go on
// (Settings > Memory), sent with every reply in any story they are in. Editable here.
export function MemoriesTab({ character, memories, userName }: { character: CharacterView; memories: string; userName: string }) {
  const [text, setText] = useState(memories);
  const [saved, setSaved] = useState(memories);
  const { pending, error, run } = useAsync();

  const save = (value: string) =>
    run(async () => {
      unwrap(await saveCharacterMemories(character.id, value));
      setText(value);
      setSaved(value);
    });

  return (
    <div className="max-w-2xl">
      <h2 className="tab-heading">What {character.name} remembers</h2>
      <p className="mt-2 text-sm text-muted">
        What {character.name} has learned about {userName} across all your stories. Every six exchanges, the latest events are added here in the
        background, and it goes into every story with {character.name}. Correct anything that&apos;s wrong: your edits are kept and built on.
      </p>
      {!saved.trim() && (
        <p className="mt-6 rounded-lg border border-line p-4 text-sm text-muted">
          Nothing yet. Play a few exchanges with {character.name} and their memories start here, or write what they should already know about{" "}
          {userName}.
        </p>
      )}
      <TextArea
        className="mt-6"
        rows={12}
        value={text}
        maxLength={6000}
        placeholder={`For example:\n- ${userName} drinks too much coffee\n- ${character.name} promised to show ${userName} the garden`}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={pending || text === saved} onClick={() => save(text)}>
          {pending ? "Saving…" : "Save memories"}
        </Button>
        {saved.trim() && (
          <Button
            variant="danger"
            disabled={pending}
            onClick={async () => {
              const ok = await askConfirm({
                title: `Clear ${character.name}'s memories?`,
                body: `Everything ${character.name} remembers about ${userName} from past stories will be erased. Stories themselves keep their own summaries.`,
                confirmLabel: "Clear memories",
                danger: true,
              });
              if (ok) save("");
            }}
          >
            Clear memories
          </Button>
        )}
        {text === saved && saved.trim() && !pending && <span className="text-sm text-muted">Saved</span>}
        <ErrorText error={error} />
      </div>
    </div>
  );
}
