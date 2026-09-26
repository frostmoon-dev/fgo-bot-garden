"use client";

import type { ReactNode } from "react";
import { usePlay } from "./usePlay";

export function PanelShell({ title, children }: { title: string; children: ReactNode }) {
  const setPanel = usePlay((s) => s.setPanel);
  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/55 sm:items-center sm:p-8"
      onClick={(e) => {
        e.stopPropagation();
        setPanel(null);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="vn-box vn-panel flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-line bg-canvas shadow-2xl sm:max-h-full sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="font-title text-lg font-semibold">{title}</h2>
          <button type="button" className="min-h-10 rounded-lg px-3 text-sm text-muted hover:bg-raised hover:text-ink" onClick={() => setPanel(null)}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-2">{children}</div>
      </div>
    </div>
  );
}
