"use client";

import { useState } from "react";
import { savePersona } from "@/app/actions/library";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextArea, TextInput } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
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
    <div className="max-w-xl space-y-8">
      <Label title="Name" hint="Replaces {{user}} everywhere.">
        <TextInput value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </Label>
      <Label
        title="Your role in the story"
        hint="Who you are in the world. Characters treat you this way even when their canon expects someone else. For example: Master of Chaldea; a Chaldea staff member (not a Master); a café owner in Fuyuki."
      >
        <TextInput value={form.role} maxLength={300} onChange={(e) => set({ role: e.target.value })} />
      </Label>
      <Label title="How characters address you" hint="For example: Master, Senpai, Ritsuka-kun.">
        <TextInput value={form.addressAs} onChange={(e) => set({ addressAs: e.target.value })} />
      </Label>
      <Label title="Short description" hint="Pronouns, appearance, personality, and anything the characters would know.">
        <TextArea rows={5} value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </Label>
      <div className="flex items-center gap-4 border-t border-line pt-6">
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
          {pending ? "Saving…" : "Save persona"}
        </Button>
        {saved && <span className="text-sm text-muted">Saved</span>}
      </div>
      <ErrorText error={error} />
    </div>
  );
}
