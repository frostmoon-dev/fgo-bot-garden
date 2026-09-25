"use client";

import { ColorDot } from "@/components/ui/ColorDot";
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
    <div className="relative mx-auto w-full max-w-[52rem]">
      {name && !waiting && (
        <div className="vn-box absolute -top-4 left-4 z-10 flex items-center gap-2 rounded-lg px-4 py-1.5 text-[0.95em] font-semibold sm:left-6">
          {color && <ColorDot color={color} />}
          {name}
        </div>
      )}
      <div className="vn-box min-h-[7.5em] px-6 pb-7 pt-7 text-[1.1em] leading-[1.7] sm:px-8" aria-live="polite">
        {waiting ? (
          <p className="flex gap-1.5 pt-1 text-muted" aria-label="Writing…">
            <span className="pulse-dot size-2 rounded-full bg-current" />
            <span className="pulse-dot size-2 rounded-full bg-current [animation-delay:200ms]" />
            <span className="pulse-dot size-2 rounded-full bg-current [animation-delay:400ms]" />
          </p>
        ) : (
          <p className={`whitespace-pre-wrap ${narration ? "italic text-muted" : ""}`}>{text}</p>
        )}
        {done && !waiting && (
          <span aria-hidden className="pulse-dot absolute bottom-3 right-5 text-xs text-muted">
            ▼
          </span>
        )}
      </div>
    </div>
  );
}
