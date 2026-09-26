"use client";

import { useState } from "react";
import { normalizeScene, SCENE_KEYS } from "@/lib/scene";
import { PanelShell } from "./PanelShell";
import { usePlay, usePlayApi } from "./usePlay";

export function ScenePanel() {
  const scene = usePlay((s) => s.session.scene);
  const busy = usePlay((s) => s.sceneBusy);
  const tracker = usePlay((s) => s.settings.sceneTracker);
  const { patchSession, refreshScene, setPanel } = usePlayApi().getState();
  const [draft, setDraft] = useState(scene);
  const [seen, setSeen] = useState(scene);
  // Pick up an automatic update that arrives while the panel is open.
  if (scene !== seen) {
    setSeen(scene);
    setDraft(scene);
  }

  return (
    <PanelShell title="Scene">
      <p className="text-sm text-muted">
        The state of the world right now. It is sent with every reply so places, time and who is present stay consistent, and it sets the
        light and weather on stage. {tracker ? "It updates after each reply." : "Automatic updates are off in Settings."}
      </p>
      <textarea
        className="field mt-4 min-h-44 font-mono text-sm"
        value={draft}
        placeholder={SCENE_KEYS.map((k) => `${k}: …`).join("\n")}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={draft === scene}
          onClick={() => {
            patchSession({ scene: normalizeScene(draft) });
            setPanel(null);
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="min-h-10 rounded-lg border border-line bg-raised px-4 text-sm disabled:opacity-40"
          disabled={busy}
          onClick={() => void refreshScene()}
        >
          {busy ? "Reading the story…" : "Update from the story"}
        </button>
      </div>
    </PanelShell>
  );
}
