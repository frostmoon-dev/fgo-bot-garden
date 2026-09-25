"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { deleteSlot, loadSlot, saveToSlot } from "@/app/actions/sessions";
import type { SaveSlotView } from "@/lib/types";
import { PanelShell } from "./PanelShell";
import { usePlay, usePlayApi } from "./usePlay";

const SLOTS = Array.from({ length: 10 }, (_, i) => i + 1);

export function SavePanel() {
  const sessionId = usePlay((s) => s.session.id);
  const streaming = usePlay((s) => s.streaming);
  const saves = usePlay((s) => s.session.saves);
  const api = usePlayApi();
  const setSaves = (fn: (list: SaveSlotView[]) => SaveSlotView[]) => api.getState().setSaves(fn(api.getState().session.saves));
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(slot: number, fn: () => Promise<void>) {
    setBusy(slot);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const save = (slot: number) =>
    act(slot, async () => {
      const existing = saves.find((s) => s.slot === slot);
      if (existing && !confirm(`Overwrite slot ${slot}?`)) return;
      const label = prompt("Name this save (optional)", existing?.label ?? "") ?? "";
      unwrap(await saveToSlot(sessionId, slot, label));
      const entry = { slot, label, createdAt: new Date().toISOString() };
      setSaves((list) => [...list.filter((s) => s.slot !== slot), entry].sort((a, b) => a.slot - b.slot));
    });

  const load = (slot: number) =>
    act(slot, async () => {
      if (!confirm(`Load slot ${slot}? Unsaved progress after it will be replaced.`)) return;
      unwrap(await loadSlot(sessionId, slot));
      window.location.reload();
    });

  const remove = (slot: number) =>
    act(slot, async () => {
      if (!confirm(`Delete slot ${slot}?`)) return;
      unwrap(await deleteSlot(sessionId, slot));
      setSaves((list) => list.filter((s) => s.slot !== slot));
    });

  return (
    <PanelShell title="Save / Load">
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {SLOTS.map((slot) => {
          const s = saves.find((x) => x.slot === slot);
          return (
            <li key={slot} className="flex items-center gap-3 rounded-md border border-night-3 p-3">
              <span className="font-display text-xl text-gold">{slot}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{s ? s.label || "Saved" : <span className="text-ink-dim">Empty</span>}</p>
                {s && <p className="text-xs text-ink-dim">{new Date(s.createdAt).toLocaleString()}</p>}
              </div>
              <div className="flex gap-1.5 text-xs">
                <button type="button" disabled={busy !== null || streaming} className="rounded border border-night-3 px-2 py-1 hover:border-gold" onClick={() => save(slot)}>
                  Save
                </button>
                {s && (
                  <>
                    <button type="button" disabled={busy !== null || streaming} className="rounded border border-night-3 px-2 py-1 hover:border-gold" onClick={() => load(slot)}>
                      Load
                    </button>
                    <button type="button" disabled={busy !== null} className="rounded border border-night-3 px-2 py-1 text-danger" onClick={() => remove(slot)}>
                      ✕
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </PanelShell>
  );
}
