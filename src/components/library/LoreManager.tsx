"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { deleteLore, saveLore, type LoreInput } from "@/app/actions/library";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextArea, TextInput } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import type { LoreEntry } from "@/lib/lorebook";
import { askConfirm } from "@/components/ui/dialogs";

function LoreForm({ entry, onDone }: { entry: LoreEntry | null; onDone: () => void }) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [keywords, setKeywords] = useState(entry?.keywords.join(", ") ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [enabled, setEnabled] = useState(entry?.enabled ?? true);
  const { pending, error, run } = useAsync();

  const input = (): LoreInput => ({
    title,
    keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
    content,
    enabled,
  });

  return (
    <div className="card max-w-3xl space-y-6 p-6">
      <Label title="Title">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Moon Cell" />
      </Label>
      <Label title="Keywords" hint="Comma separated. Whole words, any case.">
        <TextInput value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Moon Cell, SE.RA.PH" />
      </Label>
      <Label title="Content" hint="Inserted into the prompt when a keyword appears in recent messages.">
        <TextArea rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
      </Label>
      <label className="flex min-h-10 items-center gap-3 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
      </label>
      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              unwrap(await saveLore(entry?.id ?? null, input()));
              onDone();
            })
          }
        >
          Save entry
        </Button>
        <Button onClick={onDone}>Cancel</Button>
        <ErrorText error={error} />
      </div>
    </div>
  );
}

export function LoreManager({ entries }: { entries: LoreEntry[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const { pending, error, run } = useAsync();

  return (
    <div className="max-w-3xl space-y-8">
      {editing === "new" ? (
        <LoreForm entry={null} onDone={() => setEditing(null)} />
      ) : (
        <Button variant="primary" onClick={() => setEditing("new")}>
          Add entry
        </Button>
      )}
      <ErrorText error={error} />
      <ul className="card divide-y divide-line empty:hidden">
        {entries.map((e) =>
          editing === e.id ? (
            <li key={e.id}>
              <LoreForm entry={e} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={e.id} className={`px-5 py-4 ${e.enabled ? "" : "opacity-55"}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {e.title || "Untitled"}
                    {!e.enabled && <span className="ml-2 text-sm font-normal text-muted">off</span>}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {e.keywords.map((k) => (
                      <span key={k} className="rounded-md bg-raised px-2 py-0.5 text-sm">
                        {k}
                      </span>
                    ))}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{e.content}</p>
                </div>
                <Button onClick={() => setEditing(e.id)}>Edit</Button>
                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={async () => {
                    const ok = await askConfirm({
                      title: "Delete lorebook entry?",
                      body: `"${e.title}" will be removed from the lorebook and no longer added to prompts. This cannot be undone.`,
                      confirmLabel: "Delete entry",
                      danger: true,
                    });
                    if (ok) run(async () => unwrap(await deleteLore(e.id)));
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
