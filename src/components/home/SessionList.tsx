"use client";

import Link from "next/link";
import { deleteSession } from "@/app/actions/sessions";
import { FaceThumb } from "@/components/sprite/SpriteView";
import type { SheetGrid } from "@/components/sprite/sheet";
import { ColorDot } from "@/components/ui/ColorDot";
import { ErrorText } from "@/components/ui/ErrorText";
import { LocalTime } from "@/components/ui/LocalTime";
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
  // Where the story is now, from its scene box.
  place: string;
  lastLine: { name: string | null; text: string } | null;
  thumb: { grid: SheetGrid; sheetUrl: string; cell: number } | null;
}

// New stories are titled "BB (Swimsuit) — 26/09/2026". The card shows when it was last played,
// so the date is left off here.
function cardTitle(title: string): string {
  return title.replace(/\s+—\s+\d{1,2}\/\d{1,2}\/\d{4}$/, "");
}

// Story cards. With `highlightFirst`, the most recent story gets the one filled Continue button.
export function SessionList({ sessions, highlightFirst = false }: { sessions: SessionRow[]; highlightFirst?: boolean }) {
  const { pending, error, run } = useAsync();
  if (!sessions.length) return <p className="text-muted">No stories yet. Pick a character below to start one.</p>;

  return (
    <div>
      <ErrorText error={error} />
      <ul className="grid gap-4 lg:grid-cols-2">
        {sessions.map((s, i) => {
          const title = cardTitle(s.title);
          const primary = highlightFirst && i === 0;
          return (
            <li key={s.id} className="card flex flex-col p-5">
              <div className="flex items-center gap-4">
                <Link href={`/play/${s.id}`} className="shrink-0" tabIndex={-1} aria-hidden>
                  {s.thumb ? (
                    <FaceThumb grid={s.thumb.grid} sheetUrl={s.thumb.sheetUrl} cell={s.thumb.cell} className="size-14 rounded-xl bg-raised" />
                  ) : (
                    <span className="flex size-14 items-center justify-center rounded-xl bg-raised text-xl font-semibold text-muted">
                      {s.characterName.slice(0, 1)}
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/play/${s.id}`} className="block truncate font-title text-lg font-semibold leading-snug hover:underline" title={s.title}>
                    {title}
                  </Link>
                  <p className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted">
                    <ColorDot color={s.color} />
                    <span className="truncate">{s.place || s.characterName}</span>
                  </p>
                </div>
              </div>

              {s.lastLine && (
                <p className="mt-4 line-clamp-2 text-sm leading-relaxed">
                  {s.lastLine.name && <span className="font-semibold">{s.lastLine.name}: </span>}
                  <span className={s.lastLine.name ? "text-muted" : "vn-narration"}>{s.lastLine.text}</span>
                </p>
              )}

              <div className="mt-auto flex items-center gap-3 pt-5">
                <Link
                  href={`/play/${s.id}`}
                  className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm ${primary ? "bg-accent font-semibold text-on-accent" : "border border-line bg-raised hover:border-muted"}`}
                >
                  Continue
                </Link>
                <span className="min-w-0 truncate text-xs text-muted">
                  {s.messageCount} {s.messageCount === 1 ? "message" : "messages"} · <LocalTime iso={s.updatedAt} relative />
                </span>
                <button
                  type="button"
                  className="ml-auto min-h-10 shrink-0 rounded-lg px-3 text-sm text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                  disabled={pending}
                  aria-label={`Delete ${s.title}`}
                  onClick={() => {
                    if (confirm(`Delete "${s.title}" and all ${s.messageCount} messages? This cannot be undone.`)) run(async () => unwrap(await deleteSession(s.id)));
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
