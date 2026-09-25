"use client";

import { StageButton } from "./StageButton";
import { usePlay, usePlayApi } from "./usePlay";

// Shown while the current line belongs to the latest reply: swipe between versions or regenerate.
export function VariantControls({ messageId }: { messageId: string }) {
  const message = usePlay((s) => s.messages.find((m) => m.id === messageId));
  const streaming = usePlay((s) => s.streaming);
  const { swipe, regenerate } = usePlayApi().getState();
  if (!message) return null;
  const count = message.variants.length;
  return (
    <div className="flex items-center gap-1.5">
      {count > 1 && (
        <>
          <StageButton aria-label="Previous version" disabled={streaming || message.activeVariant === 0} onClick={() => swipe(messageId, -1)}>
            ‹
          </StageButton>
          <span className="min-w-12 rounded-lg bg-canvas/75 px-2 py-2 text-center text-sm tabular-nums backdrop-blur-md">
            {message.activeVariant + 1}/{count}
          </span>
          <StageButton aria-label="Next version" disabled={streaming || message.activeVariant >= count - 1} onClick={() => swipe(messageId, 1)}>
            ›
          </StageButton>
        </>
      )}
      <StageButton disabled={streaming} onClick={() => void regenerate()}>
        Regenerate
      </StageButton>
    </div>
  );
}
