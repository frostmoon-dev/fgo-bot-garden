"use client";

import { useEffect } from "react";
import { usePlay, usePlayApi } from "./usePlay";

// Typewriter, auto-advance, skip and keyboard control.
export function usePlaybackEffects() {
  const api = usePlayApi();
  const cursor = usePlay((s) => s.cursor);
  const beat = usePlay((s) => s.scene.stageBeats[s.cursor]);
  const length = beat?.text.length ?? 0;
  const typedDone = usePlay((s) => s.typed >= length);
  const auto = usePlay((s) => s.auto);
  const skip = usePlay((s) => s.skip);
  const streaming = usePlay((s) => s.streaming);
  const panel = usePlay((s) => s.panel);
  const textSpeed = usePlay((s) => s.settings.textSpeed);
  const autoSpeed = usePlay((s) => s.settings.autoSpeed);
  const atEnd = usePlay((s) => s.cursor >= s.scene.stageBeats.length - 1);

  useEffect(() => {
    if (!beat || typedDone) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const s = api.getState();
      const next = Math.min(length, s.typed + ((now - last) * textSpeed) / 1000);
      last = now;
      s.setTyped(next);
      if (next < length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [api, beat, cursor, length, typedDone, textSpeed]);

  useEffect(() => {
    if (!auto || !typedDone || !beat || panel) return;
    if (atEnd && !streaming) return;
    const t = setTimeout(() => api.getState().advance(), autoSpeed);
    return () => clearTimeout(t);
  }, [api, auto, typedDone, beat, panel, atEnd, streaming, autoSpeed]);

  useEffect(() => {
    if (!skip) return;
    const t = setInterval(() => {
      const s = api.getState();
      const end = s.cursor >= s.scene.stageBeats.length - 1 && s.typed >= (s.scene.stageBeats[s.cursor]?.text.length ?? 0);
      if (end && !s.streaming) s.setSkip(false);
      else s.advance();
    }, 60);
    return () => clearInterval(t);
  }, [api, skip]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = api.getState();
      if (e.key === "Escape" && s.panel) return s.setPanel(null);
      const el = e.target as HTMLElement | null;
      if (s.panel || el?.closest("input, textarea, select, button")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        s.advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);
}
