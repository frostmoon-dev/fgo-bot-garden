"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { deleteSlot, loadSlot, saveToSlot } from "@/app/actions/sessions";
import type { SaveSlotView } from "@/lib/types";
import { LocalTime } from "@/components/ui/LocalTime";
import { PanelShell } from "./PanelShell";
import { usePlay, usePlayApi } from "./usePlay";
import { askConfirm, askText } from "@/components/ui/dialogs";

const SLOTS = Array.from({ length: 10 }, (_, i) => i + 1);

export function SavePanel() {
  const sessionId = usePlay((s) => s.session.id);
  const streaming = usePlay((s) => s.streaming);
  const saves = usePlay((s) => s.session.saves);
  const api = usePlayApi();
  const setSaves = (fn: (list: SaveSlotView[]) => SaveSlotView[]) => api.getState().setSaves(fn(api.getState().session.saves));
  const fgo = usePlay((s) => s.settings.frameStyle === "fgo");
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
      if (
        existing &&
        !(await askConfirm({
          title: `Overwrite slot ${slot}?`,
          body: `The save${existing.label ? ` "${existing.label}"` : ""} in this slot will be replaced by the story as it is now.`,
          confirmLabel: "Overwrite",
          danger: true,
        }))
      )
        return;
      const label = await askText({
        title: `Save to slot ${slot}`,
        label: "Name this save (optional)",
        initial: existing?.label ?? "",
        confirmLabel: "Save",
        maxLength: 80,
      });
      if (label === null) return;
      unwrap(await saveToSlot(sessionId, slot, label));
      const entry = { slot, label, createdAt: new Date().toISOString() };
      setSaves((list) => [...list.filter((s) => s.slot !== slot), entry].sort((a, b) => a.slot - b.slot));
    });

  const load = (slot: number) =>
    act(slot, async () => {
      const ok = await askConfirm({
        title: `Load slot ${slot}?`,
        body: "The story goes back to this save. Anything after it that you haven't saved will be lost.",
        confirmLabel: "Load save",
        danger: true,
      });
      if (!ok) return;
      unwrap(await loadSlot(sessionId, slot));
      window.location.reload();
    });

  const remove = (slot: number) =>
    act(slot, async () => {
      const ok = await askConfirm({
        title: `Delete slot ${slot}?`,
        body: "This save will be deleted. The story itself stays as it is.",
        confirmLabel: "Delete save",
        danger: true,
      });
      if (!ok) return;
      unwrap(await deleteSlot(sessionId, slot));
      setSaves((list) => list.filter((s) => s.slot !== slot));
    });

  return (
    <PanelShell title={fgo ? "Save" : "Save and load"}>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {SLOTS.map((slot) => {
          const s = saves.find((x) => x.slot === slot);
          return (
            <li key={slot} className={fgo ? "vn-plate vn-plate-row" : "card flex items-center gap-4 p-4"}>
              <span className="vn-slot-number w-6 text-center text-lg font-semibold tabular-nums text-muted">{slot}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s ? s.label || "Saved" : <span className={`font-normal ${fgo ? "text-[#8a8577]" : "text-muted"}`}>Empty</span>}</p>
                {s && (
                  <p className="vn-slot-date mt-0.5 text-sm text-muted">
                    <LocalTime iso={s.createdAt} />
                  </p>
                )}
              </div>
              <div className="flex gap-1 text-sm">
                <button type="button" disabled={busy !== null || streaming} className={fgo ? "vn-hex" : "min-h-10 rounded-lg px-3 hover:bg-raised disabled:opacity-40"} onClick={() => save(slot)}>
                  Save
                </button>
                {s && (
                  <>
                    <button type="button" disabled={busy !== null || streaming} className={fgo ? "vn-hex" : "min-h-10 rounded-lg bg-accent px-3 font-semibold text-on-accent disabled:opacity-40"} onClick={() => load(slot)}>
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
