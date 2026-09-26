"use client";

import { useState } from "react";
import { updateAscension, type AscensionInput } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextArea } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import { PROFILE_FIELDS, type ProfileField } from "@/lib/ascension";
import { isMotionStyle, MOTION_STYLES, resolveMotion } from "@/lib/motion";
import { unwrap } from "@/lib/actionResult";
import type { CharacterView, SpriteSetView } from "@/lib/types";

const FIELDS: Record<ProfileField, { title: string; hint: string; rows?: number }> = {
  description: { title: "Description", hint: "Appearance in this ascension, and who they are here." },
  personality: { title: "Personality", hint: "How they act in this form, if it differs." },
  speechStyle: { title: "Speech style", hint: "How they talk in this form." },
  lore: { title: "Background / lore", hint: "What is true of this form.", rows: 5 },
  relationship: { title: "Relationship with {{user}}", hint: "" },
  scenario: { title: "Scenario", hint: "Where and when a story with this ascension starts." },
  greeting: { title: "Greeting", hint: "First message for this ascension, in the tag format. Switching ascension in a story swaps it in.", rows: 6 },
  exampleDialogues: { title: "Example dialogues", hint: "A few short exchanges in this form's voice.", rows: 6 },
  openingScene: { title: "Opening scene", hint: "Fills the scene box: Location, Time, Weather, Present, Mood, Situation.", rows: 6 },
};

function pick(set: SpriteSetView): AscensionInput {
  const fields = Object.fromEntries(PROFILE_FIELDS.map((f) => [f, set[f]])) as Omit<AscensionInput, "motion">;
  return { ...fields, motion: isMotionStyle(set.motion) ? set.motion : "" };
}

// One ascension's own definition. Each empty field uses the character's profile.
export function AscensionForm({ character, set }: { character: CharacterView; set: SpriteSetView }) {
  const [form, setForm] = useState(() => pick(set));
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useAsync();
  const own = PROFILE_FIELDS.filter((f) => form[f].trim()).length;

  return (
    <div className="max-w-3xl space-y-8">
      <p className="text-sm text-muted">
        Write only what changes in <span className="text-ink">{set.name}</span>. Empty fields use the profile ({own} of {PROFILE_FIELDS.length}{" "}
        fields are this ascension&apos;s own).
      </p>
      <Label title="Motion" hint={MOTION_STYLES[resolveMotion(character.motion, form.motion)].hint}>
        <select
          className="field"
          value={form.motion}
          onChange={(e) => {
            setSaved(false);
            setForm((v) => ({ ...v, motion: e.target.value as AscensionInput["motion"] }));
          }}
        >
          <option value="">Same as the profile ({MOTION_STYLES[resolveMotion(character.motion)].label})</option>
          {Object.entries(MOTION_STYLES).map(([id, m]) => (
            <option key={id} value={id}>
              {m.label}
            </option>
          ))}
        </select>
      </Label>
      {PROFILE_FIELDS.map((f) => {
        const inherited = character[f].trim();
        return (
          <Label key={f} title={FIELDS[f].title} hint={FIELDS[f].hint || undefined}>
            <TextArea
              rows={FIELDS[f].rows ?? 4}
              value={form[f]}
              placeholder={inherited ? `From the profile: ${inherited.slice(0, 220)}${inherited.length > 220 ? "…" : ""}` : "Empty in the profile too"}
              onChange={(e) => {
                setSaved(false);
                setForm((v) => ({ ...v, [f]: e.target.value }));
              }}
            />
            {!form[f].trim() && inherited && <span className="mt-1 block text-xs text-muted">Using the profile&apos;s text.</span>}
          </Label>
        );
      })}
      <div className="sticky bottom-0 z-10 flex items-center gap-4 border-t border-line bg-canvas py-4">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              unwrap(await updateAscension(set.id, form));
              setSaved(true);
            })
          }
        >
          {pending ? "Saving…" : "Save ascension"}
        </Button>
        {saved && <span className="text-sm text-muted">Saved</span>}
        <ErrorText error={error} />
      </div>
    </div>
  );
}
