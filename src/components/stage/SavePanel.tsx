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
    <PanelShell title="Save and load">
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {SLOTS.map((slot) => {
          const s = saves.find((x) => x.slot === slot);
          return (
            <li key={slot} className="card flex items-center gap-4 p-4">
              <span className="w-6 text-center text-lg font-semibold tabular-nums text-muted">{slot}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s ? s.label || "Saved" : <span className="font-normal text-muted">Empty</span>}</p>
                {s && <p className="mt-0.5 text-sm text-muted">{new Date(s.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>}
              </div>
              <div className="flex gap-1 text-sm">
                <button type="button" disabled={busy !== null || streaming} className="min-h-10 rounded-lg px-3 hover:bg-raised disabled:opacity-40" onClick={() => save(slot)}>
                  Save
                </button>
                {s && (
                  <>
                    <button type="button" disabled={busy !== null || streaming} className="min-h-10 rounded-lg bg-accent px-3 font-semibold text-on-accent disabled:opacity-40" onClick={() => load(slot)}>
                      Load
                    </button>
                    <button type="button" disabled={busy !== null} aria-label={`Delete slot ${slot}`} className="min-h-10 rounded-lg px-3 text-danger hover:bg-danger/10" onClick={() => remove(slot)}>
                      Delete
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
