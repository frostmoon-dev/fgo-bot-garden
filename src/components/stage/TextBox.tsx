"use client";

import type { Beat } from "@/lib/stage";

interface Props {
  beat: Beat | null;
  typed: number;
  color: string | null;
  waiting: boolean;
  done: boolean;
}

export function TextBox({ beat, typed, color, waiting, done }: Props) {
  const name = beat?.kind === "dialogue" ? beat.speakerName : null;
  const text = beat ? beat.text.slice(0, Math.floor(typed)) : "";
  const narration = beat?.kind === "narration";

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {name && !waiting && (
        <div
          className="panel absolute -top-5 left-3 z-10 rounded-t-md border-b-0 px-4 py-1 font-display text-[1.05em] tracking-wide sm:left-6"
          style={{ color: color ?? "var(--gold)", borderColor: color ?? undefined }}
        >
          {name}
        </div>
      )}
      <div
        className="panel min-h-[7.5em] rounded-md px-5 pb-6 pt-6 text-[1.05em] leading-relaxed sm:px-8"
        aria-live="polite"
      >
        {waiting ? (
          <p className="text-ink-dim">
            <span className="blink">●</span> <span className="blink [animation-delay:200ms]">●</span>{" "}
            <span className="blink [animation-delay:400ms]">●</span>
          </p>
        ) : (
          <p className={`whitespace-pre-wrap ${narration ? "italic text-ink-dim" : ""}`}>{text}</p>
        )}
        {done && !waiting && <span className="blink absolute bottom-2 right-4 text-gold">▼</span>}
      </div>
    </div>
  );
}
