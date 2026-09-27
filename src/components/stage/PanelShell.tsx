"use client";

import type { ReactNode } from "react";
import { usePlay } from "./usePlay";

// Panels on the story screen. With FGO frames they are full screens over the scene, with the game's silver
// Close tab and an italic title; with simple frames, a centered dialog.
export function PanelShell({ title, children }: { title: string; children: ReactNode }) {
  const setPanel = usePlay((s) => s.setPanel);
  const fgo = usePlay((s) => s.settings.frameStyle === "fgo");

  if (fgo) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="vn-screen fade-in absolute inset-0 z-40 flex flex-col [--fade:180ms]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-[max(0.75rem,2.5cqw)] pt-[max(0.75rem,env(safe-area-inset-top),2.5cqh)]">
          <button type="button" className="vn-close shrink-0" onClick={() => setPanel(null)}>
            Close
          </button>
          <div className="min-w-0 text-right">
            <h2 className="vn-screen-title truncate">{title}</h2>
            <p aria-hidden className="vn-screen-sub">
              {title}
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-[max(1rem,5cqw)] pb-10 pt-6">
          <div className="mx-auto max-w-3xl">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fade-in absolute inset-0 z-40 flex items-end justify-center bg-black/55 [--fade:180ms] sm:items-center sm:p-8"
      onClick={(e) => {
        e.stopPropagation();
        setPanel(null);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="vn-box vn-panel panel-in flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-line bg-canvas shadow-2xl sm:max-h-full sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="font-title text-2xl font-semibold">{title}</h2>
          <button type="button" className="min-h-10 rounded-lg px-3 text-sm text-muted hover:bg-raised hover:text-ink" onClick={() => setPanel(null)}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-2">{children}</div>
      </div>
    </div>
  );
}

// A cream menu plate, as in the game's menus.
export function Plate({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" className="vn-plate" onClick={onClick}>
      <span className="vn-plate-label">{label}</span>
      <span aria-hidden className="vn-plate-sub">
        {sub}
      </span>
    </button>
  );
}
