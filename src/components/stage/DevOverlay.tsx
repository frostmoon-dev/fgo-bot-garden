"use client";

import { useState } from "react";
import { usePlay } from "./usePlay";

export function DevOverlay() {
  const tokens = usePlay((s) => s.promptTokens);
  const breakdown = usePlay((s) => s.promptBreakdown);
  const usage = usePlay((s) => s.lastUsage);
  const warnings = usePlay((s) => s.scene.warnings);
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute right-3 top-16 z-30 max-w-[90%] text-right text-xs sm:right-5" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded bg-black/70 px-2 py-1 font-mono text-green-300">
        ~{tokens ?? "?"} prompt tokens
        {usage?.cachedTokens != null && ` · ${Math.round((100 * usage.cachedTokens) / Math.max(1, usage.promptTokens))}% cached`} ·{" "}
        {warnings.length} warnings
      </button>
      {open && (
        <div className="mt-1 max-h-56 overflow-y-auto rounded bg-black/80 p-2 font-mono">
          {usage && (
            <p className="text-green-200">
              provider: {usage.promptTokens} prompt · {usage.completionTokens} reply ·{" "}
              {usage.cachedTokens === null
                ? "cache not reported"
                : `${usage.cachedTokens} cached (${Math.round((100 * usage.cachedTokens) / Math.max(1, usage.promptTokens))}%)`}
            </p>
          )}
          {breakdown && (
            <p className="text-green-200">
              system {breakdown.system} · memory {breakdown.memory} · history {breakdown.history} · notes {breakdown.notes}
              {breakdown.dropped > 0 && ` · ${breakdown.dropped} old messages left out to fit`}
            </p>
          )}
          {warnings.length > 0 && (
            <ul className="mt-1 text-amber-200">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
