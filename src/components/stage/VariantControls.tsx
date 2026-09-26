"use client";

import { useState } from "react";
import { StageButton } from "./StageButton";
import { usePlay, usePlayApi } from "./usePlay";

// Shown while the current line belongs to the latest reply: replay it, swipe between versions, or regenerate,
// optionally with a hint on what should change. The new version joins the others; nothing is overwritten.
export function VariantControls({ messageId }: { messageId: string }) {
  const message = usePlay((s) => s.messages.find((m) => m.id === messageId));
  const streaming = usePlay((s) => s.streaming);
  const { swipe, regenerate, replay } = usePlayApi().getState();
  const [steering, setSteering] = useState(false);
  const [hint, setHint] = useState("");
  if (!message) return null;
  const count = message.variants.length;

  const steer = () => {
    setSteering(false);
    void regenerate(hint.trim() || undefined);
    setHint("");
  };

  if (steering) {
    return (
      <form
        className="flex w-full max-w-md items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          steer();
        }}
      >
        <input
          autoFocus
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setSteering(false);
            }
          }}
          maxLength={1000}
          aria-label="What should change in the new version"
          placeholder="What should change? e.g. more teasing"
          className="vn-pill min-h-10 min-w-0 flex-1 rounded-lg bg-canvas/75 px-3 text-sm text-ink shadow-sm ring-1 ring-ink/10 backdrop-blur-md placeholder:text-muted focus:outline-none"
        />
        <StageButton type="submit" disabled={streaming}>
          Regenerate
        </StageButton>
        <StageButton aria-label="Cancel" onClick={() => setSteering(false)}>
          ×
        </StageButton>
      </form>
    );
  }

  return (
    // Wraps on a narrow phone rather than pushing past the screen edge.
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {count > 1 && (
        <>
          <StageButton aria-label="Previous version" disabled={streaming || message.activeVariant === 0} onClick={() => swipe(messageId, -1)}>
            ‹
          </StageButton>
          <span className="vn-pill min-w-12 rounded-lg bg-canvas/75 px-2 py-2 text-center text-sm tabular-nums backdrop-blur-md">
            {message.activeVariant + 1}/{count}
          </span>
          <StageButton aria-label="Next version" disabled={streaming || message.activeVariant >= count - 1} onClick={() => swipe(messageId, 1)}>
            ›
          </StageButton>
        </>
      )}
      <StageButton disabled={streaming} onClick={() => replay(messageId)} title="Play this reply again from its first line (R)">
        Replay
      </StageButton>
      <StageButton disabled={streaming} onClick={() => setSteering(true)} title="Regenerate with a hint on what should change">
        Steer
      </StageButton>
      <StageButton disabled={streaming} onClick={() => void regenerate()}>
        Regenerate
      </StageButton>
    </div>
  );
}
