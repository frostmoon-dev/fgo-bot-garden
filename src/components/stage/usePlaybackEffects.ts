"use client";

import { useEffect } from "react";
import { usePlay, usePlayApi } from "./usePlay";

// Keyboard shortcuts, listed in the Controls panel (press ?).
export const SHORTCUTS: [string, string][] = [
  ["Click, Space, Enter", "Next line"],
  ["A", "Auto on/off"],
  ["S", "Skip on/off"],
  ["H", "Hide the interface to see the scene"],
  ["L", "Log (backlog)"],
  ["M", "Menu"],
  ["R", "Replay the latest reply from its first line"],
  ["?", "This list"],
  ["Ctrl+I", "In the reply box: mark text as an action"],
  ["Esc", "Close a panel"],
];

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
  const isUserBeat = beat?.role === "user";

  useEffect(() => {
    if (!beat || typedDone) return;
    // You typed your own line already, so it appears at once.
    if (isUserBeat) return void api.getState().setTyped(length);
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
  }, [api, beat, cursor, length, typedDone, textSpeed, isUserBeat]);

  // Your line stays up until the reply's first line arrives, then the story moves on by itself.
  useEffect(() => {
    if (!isUserBeat || atEnd || panel) return;
    const t = setTimeout(() => api.getState().advance(), 700);
    return () => clearTimeout(t);
  }, [api, isUserBeat, atEnd, panel, cursor]);

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
      if (e.key === "Escape") {
        if (s.panel) return s.setPanel(null);
        if (s.hideUi) return s.setHideUi(false);
        return;
      }
      const el = e.target as HTMLElement | null;
      if (s.panel || e.ctrlKey || e.metaKey || e.altKey || el?.closest("input, textarea, select, [contenteditable]")) return;
      if (s.hideUi) {
        e.preventDefault();
        return s.setHideUi(false);
      }
      if (e.key === " " || e.key === "Enter") {
        if (el?.closest("button, a")) return;
        e.preventDefault();
        return s.advance();
      }
      const actions: Record<string, () => void> = {
        a: () => s.setAuto(!s.auto),
        s: () => s.setSkip(!s.skip),
        h: () => s.setHideUi(true),
        l: () => s.setPanel("log"),
        m: () => s.setPanel("menu"),
        r: () => s.replay(),
        "?": () => s.setPanel("help"),
      };
      const action = actions[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        action();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);
}
