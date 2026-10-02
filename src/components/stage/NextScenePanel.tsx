"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSceneStory } from "@/app/actions/sessions";
import { writeNextScene } from "@/app/actions/story";
import { ErrorText } from "@/components/ui/ErrorText";
import { useAsync } from "@/components/ui/useAsync";
import { unwrap } from "@/lib/actionResult";
import { nextSceneDirection } from "@/lib/prompt/rules";
import { PanelShell } from "./PanelShell";
import { storyForm, usePlay, usePlayApi } from "./usePlay";

// The unplayed scene survives closing the panel or reloading. It lives only in this browser.
const draftKey = (sessionId: string) => `next-scene:${sessionId}`;

function readDraft(sessionId: string): string {
  try {
    return localStorage.getItem(draftKey(sessionId)) ?? "";
  } catch {
    return "";
  }
}

function saveDraft(sessionId: string, text: string) {
  try {
    if (text) localStorage.setItem(draftKey(sessionId), text);
    else localStorage.removeItem(draftKey(sessionId));
  } catch {
    // Private windows can block storage; the draft then lasts until the panel closes.
  }
}

// "Next scene": the AI writes where the story goes from here, from everything so far. Play it now in this
// story, or start a new story with it.
export function NextScenePanel() {
  const router = useRouter();
  const api = usePlayApi();
  const session = usePlay((s) => s.session);
  const streaming = usePlay((s) => s.streaming);
  const writing = useAsync();
  const starting = useAsync();
  const [text, setText] = useState("");
  const [before, setBefore] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(readDraft(session.id));
  }, [session.id]);

  function edit(next: string) {
    setText(next);
    saveDraft(session.id, next);
  }

  function write() {
    writing.run(async () => {
      const idea = text;
      const scene = unwrap(await writeNextScene(session.id, idea));
      setBefore(idea);
      edit(scene);
    });
  }

  function play() {
    const { send, setPanel } = api.getState();
    const scene = text.trim();
    edit("");
    setPanel(null);
    void send("", nextSceneDirection(scene));
  }

  function newStory() {
    starting.run(async () => {
      const s = api.getState();
      const id = unwrap(
        await createSceneStory({
          premise: text.trim(),
          // Everyone keeps the form they are in now.
          cast: s.session.cast.map((c) => ({ characterId: c.characterId, spriteSetId: storyForm(s, c.characterId) })),
          mainCharacterId: s.session.mainCharacterId,
          mode: s.session.mode,
          backgroundId: null,
        }),
      );
      saveDraft(session.id, "");
      router.push(`/play/${id}`);
    });
  }

  const busy = writing.pending || starting.pending;
  const empty = !text.trim();

  return (
    <PanelShell title="Next scene">
      <p className="text-sm text-muted">
        Where the story goes from here. Leave the box empty and the AI picks, from everything that has happened so far; or write an idea and it
        builds the scene around it. One small extra request.
      </p>
      <label htmlFor="next-scene" className="sr-only">
        The next scene
      </label>
      <textarea
        id="next-scene"
        rows={6}
        value={text}
        disabled={writing.pending}
        onChange={(e) => edit(e.target.value)}
        placeholder="The next morning, on the training grounds… (optional)"
        className={`field mt-4 leading-relaxed ${writing.pending ? "shimmer" : ""}`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={write} disabled={busy} className="btn btn-outline">
          {writing.pending ? <span className="shimmer">Writing…</span> : empty ? "Write it with AI" : "Rewrite with AI"}
        </button>
        {before !== null && !writing.pending && (
          <button type="button" onClick={() => (edit(before), setBefore(null))} className="btn btn-quiet">
            Undo
          </button>
        )}
      </div>
      <ErrorText error={writing.error ?? starting.error} />
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <button type="button" onClick={play} disabled={busy || empty || streaming} className="btn btn-primary">
          Play it now
        </button>
        <button type="button" onClick={newStory} disabled={busy || empty} className="btn btn-quiet">
          {starting.pending ? <span className="shimmer">Setting the scene…</span> : "Start a new story with it"}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">
        {empty ? "Write the scene first, or let the AI write it." : "Play it now: the next reply jumps to this scene. A new story keeps this one as it is."}
      </p>
    </PanelShell>
  );
}
