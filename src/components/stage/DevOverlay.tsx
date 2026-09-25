"use client";

import { useState } from "react";
import { usePlay } from "./usePlay";

export function DevOverlay() {
  const tokens = usePlay((s) => s.promptTokens);
  const warnings = usePlay((s) => s.scene.warnings);
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute left-2 top-14 z-30 max-w-[90%] text-xs" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded bg-black/70 px-2 py-1 font-mono text-green-300">
        ~{tokens ?? "?"} prompt tokens · {warnings.length} warnings
      </button>
      {open && warnings.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-y-auto rounded bg-black/80 p-2 font-mono text-amber-200">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
