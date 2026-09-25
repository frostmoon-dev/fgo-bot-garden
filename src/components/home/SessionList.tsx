"use client";

import { unwrap } from "@/lib/actionResult";
import Link from "next/link";
import { deleteSession } from "@/app/actions/sessions";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";

export interface SessionRow {
  id: string;
  title: string;
  mode: string;
  updatedAt: string;
  characterName: string;
  color: string;
  messageCount: number;
}

export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const { pending, error, run } = useAsync();
  if (!sessions.length) return <p className="text-sm text-ink-dim">No sessions yet. Pick a bot above to start one.</p>;

  return (
    <div className="space-y-2">
      <ErrorText error={error} />
      <ul className="divide-y divide-night-3 rounded-lg border border-night-3">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 p-3">
            <Link href={`/play/${s.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium hover:text-gold">{s.title}</p>
              <p className="text-xs text-ink-dim">
                <span style={{ color: s.color }}>{s.characterName}</span> · {s.mode} · {s.messageCount} messages ·{" "}
                {new Date(s.updatedAt).toLocaleString()}
              </p>
            </Link>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (confirm(`Delete "${s.title}"? This cannot be undone.`)) run(async () => unwrap(await deleteSession(s.id)));
              }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
