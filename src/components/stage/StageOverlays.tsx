"use client";

import { useEffect, useState } from "react";
import { parseScene } from "@/lib/scene";
import { activeContent } from "@/lib/types";
import { SHORTCUTS } from "./usePlaybackEffects";
import { PanelShell } from "./PanelShell";
import { usePlay } from "./usePlay";

function PlaceCardInner({ location, time }: { location: string; time?: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3400);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="place-card pointer-events-none absolute inset-x-0 top-[20%] z-20 flex justify-center px-4 sm:top-[11%]" aria-live="polite">
      <div className="vn-banner text-center text-white drop-shadow-[0_2px_6px_rgb(0_0_0/0.8)]">
        <div className="vn-rule mx-auto mb-2 h-px w-48 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        {/* Long place names wrap onto two smaller lines instead of stretching the card. */}
        <p className={`font-title font-semibold leading-tight tracking-wide text-balance ${location.length > 26 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>
          {location}
        </p>
        {time && <p className="vn-banner-sub mt-1.5 text-balance text-xs uppercase tracking-[0.16em] text-white/80 sm:text-sm">{time}</p>}
        <div className="vn-rule mx-auto mt-2 h-px w-48 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      </div>
    </div>
  );
}

// Shows the place name when the story moves somewhere new, like a chapter card.
export function PlaceCard() {
  const text = usePlay((s) => s.session.scene);
  const scene = parseScene(text);
  if (!scene.Location) return null;
  return <PlaceCardInner key={scene.Location} location={scene.Location} time={scene.Time} />;
}

export function StageToast() {
  const toast = usePlay((s) => s.toast);
  const [hidden, setHidden] = useState<number | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setHidden(toast.id), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast || hidden === toast.id) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[4.25rem] z-40 flex justify-center px-4">
      <p key={toast.id} role="status" className="toast-in vn-box px-4 py-2 text-sm font-medium">
        {toast.text}
      </p>
    </div>
  );
}

// "Previously…" when you come back to a story, from the summary or the last lines.
export function RecapCard() {
  const session = usePlay((s) => s.session);
  const messages = usePlay((s) => s.messages);
  const beats = usePlay((s) => s.scene.stageBeats);
  const [open, setOpen] = useState(() => messages.length >= 4);
  // Esc (or Enter) closes it, like the story screen's panels. Captured first, so the key does nothing else.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key !== "Enter") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
  if (!open) return null;
  const scene = parseScene(session.scene);
  const summary = session.summary
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l && !/:$/.test(l))
    .slice(0, 4);
  const last = beats.filter((b) => b.kind !== "narration").slice(-2);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        e.stopPropagation();
        setOpen(false);
      }}
    >
      <div role="dialog" aria-label="Previously" className="vn-box w-full max-w-lg p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Previously</p>
        <h2 className="mt-2 font-title text-xl font-semibold">{session.title}</h2>
        {scene.Location && (
          <p className="mt-1 text-sm text-muted">
            {scene.Location}
            {scene.Time ? ` · ${scene.Time}` : ""}
          </p>
        )}
        {summary.length > 0 ? (
          <ul className="mt-5 space-y-1.5 text-sm leading-relaxed">
            {summary.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 space-y-2 text-sm leading-relaxed">
            {last.map((b) => (
              <p key={b.key}>
                {b.speakerName && <span className="font-semibold">{b.speakerName}: </span>}
                <span className={b.kind === "narration" ? "vn-narration" : "text-muted"}>{b.text}</span>
              </p>
            ))}
          </div>
        )}
        {scene.Situation && <p className="mt-4 text-sm italic text-muted">{scene.Situation}</p>}
        <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => setOpen(false)}>
          Continue the story ▸
        </button>
        <p className="mt-2 text-center text-xs text-muted">{messages.filter((m) => activeContent(m).trim()).length} messages so far</p>
      </div>
    </div>
  );
}

export function HelpPanel() {
  return (
    <PanelShell title="Controls">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {SHORTCUTS.map(([keys, what]) => (
          <div key={keys} className="contents">
            <dt className="font-mono text-accent">{keys}</dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-8 font-medium">Playing</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
        <li>
          <span className="text-ink">Say</span> speaks your words. <span className="text-ink">Do</span> describes an action. In Say you can mix both:{" "}
          <span className="font-mono">*waves* Hello!</span>
        </li>
        <li>
          <span className="text-ink">Choices</span> suggests three things you could do next.
        </li>
        <li>
          <span className="text-ink">Continue</span> (send with an empty box) lets the story go on without you.
        </li>
        <li>The scene box (top left) tracks where you are. Click it for details or to edit it.</li>
        <li>Pin important moments in the Log so the AI never forgets them. Write your own notes in Menu → Story memory.</li>
        <li>Bond grows each time a character answers you, and they open up as it rises.</li>
      </ul>
    </PanelShell>
  );
}
