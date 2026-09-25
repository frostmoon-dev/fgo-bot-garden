"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { deleteBackground, saveBackground, type BackgroundInput } from "@/app/actions/library";
import { uploadImage } from "@/components/editor/sheetTools";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextInput } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import type { BackgroundView } from "@/lib/types";

const EMPTY: BackgroundInput = { key: "", label: "", imageUrl: "", description: "" };

function BackgroundForm({ initial, id, onDone }: { initial: BackgroundInput; id: string | null; onDone: () => void }) {
  const [form, setForm] = useState(initial);
  const { pending, error, run } = useAsync();
  const set = (patch: Partial<BackgroundInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="panel space-y-3 rounded-lg p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Label title="Id" hint="Used in {scene:id}. Lowercase, no spaces.">
          <TextInput
            value={form.key}
            onChange={(e) => set({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_") })}
            placeholder="chaldea_hall"
          />
        </Label>
        <Label title="Label">
          <TextInput value={form.label} onChange={(e) => set({ label: e.target.value })} placeholder="Chaldea — main hall" />
        </Label>
      </div>
      <Label title="Description" hint="The AI reads this to pick a scene.">
        <TextInput value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label title="Image path or URL" hint="Example: /assets/backgrounds/hall.webp">
          <TextInput value={form.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} />
        </Label>
        <Label title="…or upload">
          <input
            type="file"
            accept="image/png,image/webp,image/jpeg"
            className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-night-3 file:px-3 file:py-1.5 file:text-ink"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) run(async () => set({ imageUrl: await uploadImage(file, "backgrounds") }));
            }}
          />
        </Label>
      </div>
      {form.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- user-supplied URLs of any size
        <img src={form.imageUrl} alt="" className="aspect-video w-full max-w-md rounded object-cover" />
      )}
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              unwrap(await saveBackground(id, form));
              onDone();
            })
          }
        >
          {pending ? "Working…" : "Save background"}
        </Button>
        <Button onClick={onDone}>Cancel</Button>
        <ErrorText error={error} />
      </div>
    </div>
  );
}

export function BackgroundManager({ backgrounds }: { backgrounds: BackgroundView[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const { pending, error, run } = useAsync();

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <BackgroundForm initial={EMPTY} id={null} onDone={() => setEditing(null)} />
      ) : (
        <Button variant="primary" onClick={() => setEditing("new")}>
          Add background
        </Button>
      )}
      <ErrorText error={error} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {backgrounds.map((b) =>
          editing === b.id ? (
            <li key={b.id} className="sm:col-span-2 lg:col-span-3">
              <BackgroundForm initial={b} id={b.id} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={b.id} className="panel overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied URLs */}
              <img src={b.imageUrl} alt="" className="aspect-video w-full object-cover" />
              <div className="space-y-1 p-3">
                <p className="font-mono text-sm text-gold">{b.key}</p>
                <p className="text-xs text-ink-dim">{b.description || b.label}</p>
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => setEditing(b.id)}>Edit</Button>
                  <Button
                    variant="danger"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`Delete background ${b.key}?`)) run(async () => unwrap(await deleteBackground(b.id)));
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
