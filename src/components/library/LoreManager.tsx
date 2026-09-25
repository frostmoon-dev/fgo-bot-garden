"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { deleteLore, saveLore, type LoreInput } from "@/app/actions/library";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextArea, TextInput } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import type { LoreEntry } from "@/lib/lorebook";

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
    <div className="panel space-y-3 rounded-lg p-4">
      <Label title="Title">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Moon Cell" />
      </Label>
      <Label title="Keywords" hint="Comma separated. Whole words, any case.">
        <TextInput value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Moon Cell, SE.RA.PH" />
      </Label>
      <Label title="Content" hint="Inserted into the prompt when a keyword appears in recent messages.">
        <TextArea rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
      </Label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
      </label>
      <div className="flex gap-2">
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
    <div className="space-y-4">
      {editing === "new" ? (
        <LoreForm entry={null} onDone={() => setEditing(null)} />
      ) : (
        <Button variant="primary" onClick={() => setEditing("new")}>
          Add entry
        </Button>
      )}
      <ErrorText error={error} />
      <ul className="space-y-2">
        {entries.map((e) =>
          editing === e.id ? (
            <li key={e.id}>
              <LoreForm entry={e} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={e.id} className={`panel rounded-lg p-3 ${e.enabled ? "" : "opacity-50"}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.title || "(untitled)"}</p>
                  <p className="text-xs text-gold">{e.keywords.join(", ")}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-dim">{e.content}</p>
                </div>
                <Button onClick={() => setEditing(e.id)}>Edit</Button>
                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Delete this entry?")) run(async () => unwrap(await deleteLore(e.id)));
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
