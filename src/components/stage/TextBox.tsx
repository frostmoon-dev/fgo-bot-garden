"use client";

import { useEffect, useState } from "react";
import { ColorDot } from "@/components/ui/ColorDot";
import type { Beat } from "@/lib/stage";

interface Props {
  beat: Beat | null;
  typed: number;
  color: string | null;
  waiting: boolean;
  // Your line is up and the reply is being written.
  pending: boolean;
  done: boolean;
  // Opens the Log from the window's LOG tab (shown with FGO frames).
  onLog?: () => void;
}

function Dots() {
  return (
    <span className="ml-2 inline-flex gap-1 align-middle" aria-label="Writing…">
      <span className="pulse-dot size-1.5 rounded-full bg-current" />
      <span className="pulse-dot size-1.5 rounded-full bg-current [animation-delay:200ms]" />
      <span className="pulse-dot size-1.5 rounded-full bg-current [animation-delay:400ms]" />
    </span>
  );
}

// After a while with no reply, say what is going on, so a slow model doesn't look like a frozen screen.
function SlowNote() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15_000);
    return () => clearTimeout(timer);
  }, []);
  if (!slow) return null;
  return (
    <span className="mt-2 block text-[0.85em] not-italic text-muted">
      Still waiting for the model. If it&apos;s busy or times out, it&apos;s asked again on its own.
    </span>
  );
}

export function TextBox({ beat, typed, color, waiting, pending, done, onLog }: Props) {
  const name = beat?.kind === "dialogue" || beat?.kind === "user" ? beat.speakerName : null;
  const text = beat ? beat.text.slice(0, Math.floor(typed)) : "";
  const narration = beat?.kind === "narration";
  const mine = beat?.role === "user";

  return (
    <div className="vn-lane relative mx-auto w-full max-w-[52rem]">
      {name && !waiting && (
        // Keyed by name, so the tab slides in again when the speaker changes.
        <div
          key={`${mine ? "me" : "them"}:${name}`}
          className={`vn-box vn-name name-in absolute -top-4 z-10 flex items-center gap-2 rounded-lg px-4 py-1.5 font-name text-[1em] font-bold ${mine ? "vn-name-mine right-4 sm:right-6" : "left-4 sm:left-6"}`}
        >
          <ColorDot className="vn-dot" color={mine ? "var(--accent)" : (color ?? "var(--muted)")} />
          {name}
        </div>
      )}
      <div className="vn-box vn-text min-h-[7.5em] px-6 pb-7 pt-7 text-[1.1em] leading-[1.7] sm:px-8" aria-live="polite">
        {waiting ? (
          <p className="pt-1 text-muted">
            <Dots />
            <SlowNote />
          </p>
        ) : (
          <p className={`whitespace-pre-wrap ${beat?.thinker ? "vn-thought" : narration ? "vn-narration" : ""}`}>
            {beat?.thinker && <span className="vn-thinker">{beat.thinker.name} · thinking</span>}
            {text}
            {pending && <Dots />}
            {pending && <SlowNote />}
          </p>
        )}
        {onLog && (
          <button
            type="button"
            className="vn-log-tab absolute right-3 top-1.5 min-h-10 min-w-10 flex-col items-center justify-center text-[0.65rem] font-semibold tracking-wider text-muted hover:text-ink"
            onClick={(e) => {
              e.stopPropagation();
              onLog();
            }}
            title="Log (L)"
          >
            <span aria-hidden className="vn-log-arch" />
            LOG
          </button>
        )}
        {done && !waiting && !pending && <span aria-hidden className="vn-next pulse-dot absolute bottom-3 right-5 text-xs text-muted" />}
      </div>
    </div>
  );
}
