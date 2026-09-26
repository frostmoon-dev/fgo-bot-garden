"use client";

import { useEffect, useRef, useState } from "react";
import { activeContent, type MessageView } from "@/lib/types";
import { ColorDot } from "@/components/ui/ColorDot";
import { PanelShell } from "./PanelShell";
import { usePlay, usePlayApi } from "./usePlay";
import { askConfirm } from "@/components/ui/dialogs";

function MessageBlock({ message }: { message: MessageView }) {
  const beats = usePlay((s) => s.scene.beats);
  const characters = usePlay((s) => s.characters);
  const streaming = usePlay((s) => s.streaming);
  const { editMessage, deleteMessage, togglePin } = usePlayApi().getState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const lines = beats.filter((b) => b.messageId === message.id);

  if (editing) {
    return (
      <div className="card my-3 space-y-3 p-4">
        <p className="text-sm text-muted">Raw text. AI lines use the tag format, for example [BB|smirk] Hello.</p>
        <textarea className="field min-h-40 font-mono text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              editMessage(message.id, draft);
              setEditing(false);
            }}
          >
            Save
          </button>
          <button type="button" className="min-h-10 rounded-lg px-4 text-sm text-muted hover:bg-raised" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group border-b border-line py-4 last:border-b-0 ${message.pinned ? "border-l-2 border-l-accent pl-3" : ""}`}>
      {message.pinned && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">Pinned</p>}
      {lines.length === 0 && <p className="text-sm italic text-muted">(no visible lines)</p>}
      {lines.map((b) => (
        <p key={b.key} className={`leading-relaxed [&+p]:mt-2 ${b.kind === "narration" ? "vn-narration" : ""}`}>
          {b.speakerName && (
            <span className="mr-2 inline-flex items-center gap-1.5 font-name font-bold">
              {b.kind !== "user" && b.speakerId && characters[b.speakerId] && <ColorDot color={characters[b.speakerId].color} />}
              {b.speakerName}
            </span>
          )}
          {b.text}
        </p>
      ))}
      <div className="mt-2 flex items-center gap-1 text-sm text-muted sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {message.variants.length > 1 && (
          <span className="mr-2">
            version {message.activeVariant + 1}/{message.variants.length}
          </span>
        )}
        <button
          type="button"
          disabled={streaming || message.id.startsWith("temp")}
          className="min-h-9 rounded-lg px-2 hover:bg-raised hover:text-ink disabled:opacity-40"
          title="Pinned messages stay in the AI's memory, even after the story is summarized."
          onClick={() => togglePin(message.id)}
        >
          {message.pinned ? "Unpin" : "Pin"}
        </button>
        <button
          type="button"
          disabled={streaming}
          className="min-h-9 rounded-lg px-2 hover:bg-raised hover:text-ink disabled:opacity-40"
          onClick={() => {
            setDraft(activeContent(message));
            setEditing(true);
          }}
        >
          Edit
        </button>
        <button
          type="button"
          disabled={streaming}
          className="min-h-9 rounded-lg px-2 hover:bg-danger/10 hover:text-danger disabled:opacity-40"
          onClick={async () => {
            const ok = await askConfirm({
              title: "Delete this message?",
              body: "It will be removed from the story, with all its versions. This cannot be undone.",
              confirmLabel: "Delete message",
              danger: true,
            });
            if (ok) deleteMessage(message.id);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export function BacklogPanel() {
  const messages = usePlay((s) => s.messages);
  const endRef = useRef<HTMLDivElement>(null);
  // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect may only return a cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, []);
  return (
    <PanelShell title="Backlog">
      <div>
        {messages.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
        {messages.map((m) => (
          <MessageBlock key={m.id} message={m} />
        ))}
        <div ref={endRef} />
      </div>
    </PanelShell>
  );
}
