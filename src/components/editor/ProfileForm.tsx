"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { updateCharacterProfile, type CharacterProfileInput } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextArea, TextInput } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import type { BackgroundView, CharacterView } from "@/lib/types";

type TextField = { key: keyof CharacterProfileInput; title: string; hint?: string; rows?: number };

const TEXT_FIELDS: TextField[] = [
  { key: "description", title: "Description", hint: "Appearance and who they are." },
  { key: "personality", title: "Personality" },
  { key: "speechStyle", title: "Speech style", hint: "How they talk: verbal tics, formality, favourite words." },
  { key: "lore", title: "Background / lore", rows: 6 },
  { key: "relationship", title: "Relationship with {{user}}" },
  { key: "scenario", title: "Scenario", hint: "Where and when the story starts." },
  {
    key: "greeting",
    title: "Greeting",
    hint: "First message, written in the tag format. Example: [BB|smirk] Welcome back, {{user}}~",
    rows: 6,
  },
  {
    key: "exampleDialogues",
    title: "Example dialogues",
    hint: "A few short exchanges.",
    rows: 8,
  },
];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-10 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-6 space-y-8">{children}</div>
    </section>
  );
}

function toInput(c: CharacterView): CharacterProfileInput {
  return {
    name: c.name,
    aliases: c.aliases,
    color: c.color,
    description: c.description,
    personality: c.personality,
    speechStyle: c.speechStyle,
    lore: c.lore,
    relationship: c.relationship,
    scenario: c.scenario,
    greeting: c.greeting,
    exampleDialogues: c.exampleDialogues,
    defaultSpriteSetId: c.defaultSpriteSetId,
    defaultBackgroundId: c.defaultBackgroundId,
  };
}

export function ProfileForm({ character, backgrounds }: { character: CharacterView; backgrounds: BackgroundView[] }) {
  const [form, setForm] = useState(() => toInput(character));
  const [aliases, setAliases] = useState(character.aliases.join(", "));
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAsync();

  const set = <K extends keyof CharacterProfileInput>(key: K, value: CharacterProfileInput[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  function save() {
    run(async () => {
      const list = aliases.split(",").map((a) => a.trim()).filter(Boolean);
      unwrap(await updateCharacterProfile(character.id, { ...form, aliases: list }));
      setSaved(true);
    });
  }

  const field = (f: TextField) => (
    <Label key={f.key} title={f.title} hint={f.hint}>
      <TextArea rows={f.rows ?? 4} value={form[f.key] as string} onChange={(e) => set(f.key, e.target.value as never)} />
    </Label>
  );
  const byKey = (...keys: (keyof CharacterProfileInput)[]) => TEXT_FIELDS.filter((f) => keys.includes(f.key)).map(field);

  return (
    <div className="max-w-3xl">
      <Section title="Identity">
      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <Label title="Name">
          <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
        </Label>
        <Label title="Name plate color">
          <input
            type="color"
            value={form.color}
            onChange={(e) => set("color", e.target.value)}
            className="h-11 w-20 cursor-pointer rounded-lg border border-line bg-canvas p-1"
          />
        </Label>
      </div>
      <Label title="Other names" hint="Comma separated. The AI may use these in [Name|…] tags.">
        <TextInput value={aliases} onChange={(e) => { setSaved(false); setAliases(e.target.value); }} placeholder="BB-chan, Kouhai" />
      </Label>
      </Section>
      <Section title="Stage defaults">
      <div className="grid gap-6 sm:grid-cols-2">
        <Label title="Default sprite set">
          <select
            className="field"
            value={form.defaultSpriteSetId ?? ""}
            onChange={(e) => set("defaultSpriteSetId", e.target.value || null)}
          >
            <option value="">(first set)</option>
            {character.spriteSets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Label>
        <Label title="Default background">
          <select
            className="field"
            value={form.defaultBackgroundId ?? ""}
            onChange={(e) => set("defaultBackgroundId", e.target.value || null)}
          >
            <option value="">(none)</option>
            {backgrounds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label || b.key}
              </option>
            ))}
          </select>
        </Label>
      </div>
      </Section>
      <Section title="Character">{byKey("description", "personality", "speechStyle", "lore")}</Section>
      <Section title="Story">{byKey("relationship", "scenario")}</Section>
      <Section title="Writing samples" hint="Written in the tag format. They teach the model the voice.">
        {byKey("greeting", "exampleDialogues")}
      </Section>
      <div className="sticky bottom-0 mt-10 flex items-center gap-4 border-t border-line bg-canvas py-4">
        <Button variant="primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {saved && <span className="text-sm text-muted">Saved</span>}
        <ErrorText error={error} />
      </div>
    </div>
  );
}
