"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { savePersona } from "@/app/actions/library";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextArea, TextInput } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import type { PersonaView } from "@/lib/types";

export function PersonaForm({ persona }: { persona: PersonaView }) {
  const [form, setForm] = useState(persona);
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAsync();
  const set = (patch: Partial<PersonaView>) => {
    setSaved(false);
    setForm((f) => ({ ...f, ...patch }));
  };

  return (
    <div className="panel max-w-2xl space-y-4 rounded-lg p-4">
      <Label title="Name" hint="Replaces {{user}} everywhere.">
        <TextInput value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </Label>
      <Label title="How characters address you" hint="For example: Master, Senpai, Ritsuka-kun.">
        <TextInput value={form.addressAs} onChange={(e) => set({ addressAs: e.target.value })} />
      </Label>
      <Label title="Short description" hint="Appearance, role, anything the characters would know.">
        <TextArea value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </Label>
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              unwrap(await savePersona(form));
              setSaved(true);
            })
          }
        >
          Save persona
        </Button>
        {saved && <span className="text-sm text-ink-dim">Saved.</span>}
        <ErrorText error={error} />
      </div>
    </div>
  );
}
