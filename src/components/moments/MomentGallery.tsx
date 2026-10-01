"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteMoment } from "@/app/actions/moments";
import { Button } from "@/components/ui/Button";
import { askConfirm } from "@/components/ui/dialogs";
import { ErrorText } from "@/components/ui/ErrorText";
import { LocalTime } from "@/components/ui/LocalTime";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import type { MomentView } from "@/lib/moment";
import { MomentCard } from "./MomentCard";
import { momentPng } from "./momentImage";

function MomentDialog({ moment, onClose, onDeleted }: { moment: MomentView; onClose: () => void; onDeleted: () => void }) {
  const { pending, error, run } = useAsync();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 [--fade:150ms] sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Moment"
        className="panel-in max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-line bg-canvas p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <MomentCard moment={moment} large />
        <p className="mt-3 text-sm text-muted">
          {moment.storyTitle} · <LocalTime iso={moment.createdAt} />
        </p>
        <ErrorText error={error} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const blob = await momentPng(moment);
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `moment-${moment.createdAt.slice(0, 10)}.png`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
              })
            }
          >
            {pending ? <span className="shimmer">Making the image…</span> : "Save image"}
          </Button>
          {moment.storyExists && moment.sessionId && (
            <Link href={`/play/${moment.sessionId}`} className="btn btn-outline">
              Open the story
            </Link>
          )}
          <Button
            variant="danger"
            disabled={pending}
            onClick={async () => {
              const ok = await askConfirm({
                title: "Delete this moment?",
                body: "The card is removed from Moments. The story itself is not changed.",
                confirmLabel: "Delete moment",
                danger: true,
              });
              if (ok) run(async () => {
                unwrap(await deleteMoment(moment.id));
                onDeleted();
              });
            }}
          >
            Delete
          </Button>
          <Button variant="quiet" className="ml-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MomentGallery({ moments }: { moments: MomentView[] }) {
  const [list, setList] = useState(moments);
  const [open, setOpen] = useState<MomentView | null>(null);

  if (!list.length) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="font-medium">No moments yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          While reading a story, press K or open Menu → Keep this moment. The line on screen, with its character and background, is kept here
          as a card.
        </p>
        <Link href="/" className="btn btn-outline mt-6">
          Go to your stories
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <li key={m.id}>
            <button type="button" className="block w-full text-left" onClick={() => setOpen(m)} aria-label={`Open the moment: ${m.text}`}>
              <MomentCard moment={m} />
            </button>
            <p className="mt-2 truncate text-sm text-muted">{m.storyTitle}</p>
          </li>
        ))}
      </ul>
      {open && (
        <MomentDialog
          moment={open}
          onClose={() => setOpen(null)}
          onDeleted={() => {
            setList(list.filter((m) => m.id !== open.id));
            setOpen(null);
          }}
        />
      )}
    </>
  );
}
