"use client";

import { useState } from "react";
import { parseScene } from "@/lib/scene";
import { usePlay, usePlayApi } from "./usePlay";

// The world around the story right now: place, time, weather, who is here, what is happening.
export function SceneBox() {
  const text = usePlay((s) => s.session.scene);
  const busy = usePlay((s) => s.sceneBusy);
  const { setPanel } = usePlayApi().getState();
  const [open, setOpen] = useState(false);
  const scene = parseScene(text);
  const headline = [scene.Location, scene.Time, scene.Weather && !/indoor/i.test(scene.Weather) ? scene.Weather : null]
    .filter(Boolean)
    .join(" · ");

  if (!text.trim()) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setPanel("scene");
        }}
        className="vn-box absolute left-3 top-[4.25rem] z-20 px-3 py-2 text-left text-xs text-muted hover:text-ink sm:left-5"
      >
        {busy ? <span className="shimmer">Reading the scene…</span> : "Set the scene"}
      </button>
    );
  }

  return (
    <div
      className="vn-box absolute left-3 top-[4.25rem] z-20 w-[min(22rem,calc(100%-1.5rem))] text-sm sm:left-5"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left"
        title={open ? "Hide scene details" : "Show scene details"}
      >
        <span aria-hidden className="mt-0.5 text-accent">
          ◆
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${busy ? "shimmer" : ""}`}>{headline || "Scene"}</span>
          {!open && scene.Situation && <span className="block truncate text-xs text-muted">{scene.Situation}</span>}
        </span>
        <span aria-hidden className="text-xs text-muted">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-line px-3 pb-3 pt-2">
          {(["Situation", "Present", "Mood"] as const).map((key) =>
            scene[key] ? (
              <p key={key} className="text-xs leading-relaxed">
                <span className="text-muted">{key}: </span>
                {scene[key]}
              </p>
            ) : null,
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" className="min-h-8 rounded-md px-2 text-xs text-muted hover:bg-raised hover:text-ink" onClick={() => setPanel("scene")}>
              Edit
            </button>
            <span className="ml-auto self-center text-[0.7rem] text-muted">{busy ? "Updating…" : "Updates after each reply"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
