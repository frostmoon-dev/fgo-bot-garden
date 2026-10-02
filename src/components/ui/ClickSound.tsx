"use client";

import { useEffect, useState } from "react";

// A soft tick on every click: buttons, links, and the story stage itself. Synthesized in the browser,
// so there is no file to load. Off and on per device (Settings → Click sound).
const KEY = "click-sound";
const CHANGED = "click-sound-changed";

export function clickSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function setClickSound(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "off");
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
  window.dispatchEvent(new Event(CHANGED));
}

// Text boxes and the like get no sound: clicking into them is not an action.
const SILENT = "input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select, [contenteditable]";
const AUDIBLE = "button, a[href], [role=button], [role=tab], summary, label, input[type=checkbox], input[type=radio], .vn-frame";

export function ClickSound() {
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let on = clickSoundOn();
    const onChange = () => (on = clickSoundOn());

    const tick = () => {
      try {
        ctx ??= new AudioContext();
        if (ctx.state === "suspended") void ctx.resume();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1500, now);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.05);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch {
        // No Web Audio: clicks stay silent.
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!on || !(e.target instanceof Element)) return;
      if (e.target.closest(SILENT)) return;
      const hit = e.target.closest(AUDIBLE);
      if (!hit || (hit instanceof HTMLButtonElement && hit.disabled)) return;
      tick();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener(CHANGED, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(CHANGED, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return null;
}

// The switch on the Settings page.
export function ClickSoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    // Read after the first render: the server has no localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(clickSoundOn());
  }, []);
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        className="mt-1 size-4 accent-[var(--accent)]"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          setClickSound(e.target.checked);
        }}
      />
      <span>
        <span className="block font-medium">Click sound</span>
        <span className="block text-sm text-muted">A soft tick when you click a button or move the story on. Saved on this device only.</span>
      </span>
    </label>
  );
}
