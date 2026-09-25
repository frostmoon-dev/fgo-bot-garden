"use client";

import type { ReactNode } from "react";
import { usePlay } from "./usePlay";

export function PanelShell({ title, children }: { title: string; children: ReactNode }) {
  const setPanel = usePlay((s) => s.setPanel);
  return (
    <div
      className="absolute inset-0 z-40 flex items-stretch justify-center bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => {
        e.stopPropagation();
        setPanel(null);
      }}
    >
      <div
        role="dialog"
        aria-label={title}
        className="panel flex max-h-full w-full max-w-3xl flex-col rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-night-3 px-4 py-3">
          <h2 className="font-display text-lg text-gold">{title}</h2>
          <button type="button" className="text-sm text-ink-dim hover:text-ink" onClick={() => setPanel(null)}>
            Close ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
