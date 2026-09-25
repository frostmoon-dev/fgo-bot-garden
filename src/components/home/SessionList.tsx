"use client";

import Link from "next/link";
import { deleteSession } from "@/app/actions/sessions";
import { Button } from "@/components/ui/Button";
import { ColorDot } from "@/components/ui/ColorDot";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";

export interface SessionRow {
  id: string;
  title: string;
  mode: string;
  updatedAt: string;
  characterName: string;
  color: string;
  messageCount: number;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const { pending, error, run } = useAsync();
  if (!sessions.length) return <p className="text-muted">No stories yet. Pick a bot above to start one.</p>;

  return (
    <div>
      <ErrorText error={error} />
      <ul className="card divide-y divide-line">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-4 px-5 py-4">
            <Link href={`/play/${s.id}`} className="min-w-0 flex-1">
              <p className="truncate font-medium hover:underline">{s.title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                <ColorDot color={s.color} />
                <span>{s.characterName}</span>
                <span aria-hidden>·</span>
                <span className="capitalize">{s.mode}</span>
                <span aria-hidden>·</span>
                <span>{s.messageCount} messages</span>
                <span aria-hidden className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">{dateFormat.format(new Date(s.updatedAt))}</span>
              </p>
            </Link>
            <Link href={`/play/${s.id}`} className="hidden min-h-10 items-center rounded-lg border border-line bg-raised px-4 text-sm sm:inline-flex">
              Continue
            </Link>
            <Button
              variant="danger"
              disabled={pending}
              aria-label={`Delete ${s.title}`}
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
