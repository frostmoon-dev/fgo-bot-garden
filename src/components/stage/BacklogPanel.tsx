"use client";

import { useEffect, useRef, useState } from "react";
import { activeContent, type MessageView } from "@/lib/types";
import { PanelShell } from "./PanelShell";
import { usePlay, usePlayApi } from "./usePlay";

function MessageBlock({ message }: { message: MessageView }) {
  const beats = usePlay((s) => s.scene.beats);
  const characters = usePlay((s) => s.characters);
  const streaming = usePlay((s) => s.streaming);
  const { editMessage, deleteMessage } = usePlayApi().getState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const lines = beats.filter((b) => b.messageId === message.id);

  if (editing) {
    return (
      <div className="space-y-2 rounded-md border border-gold-dim p-3">
        <p className="text-xs text-ink-dim">Raw text. Use the tag format for AI lines.</p>
        <textarea className="field min-h-40 font-mono text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-gold px-3 py-1 text-sm font-semibold text-night"
            onClick={() => {
              editMessage(message.id, draft);
              setEditing(false);
            }}
          >
            Save
          </button>
          <button type="button" className="rounded border border-night-3 px-3 py-1 text-sm" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-md border border-transparent p-2 hover:border-night-3">
      {lines.length === 0 && <p className="text-sm italic text-ink-dim">(no visible lines)</p>}
      {lines.map((b) => (
        <p key={b.key} className={`text-sm leading-relaxed ${b.kind === "narration" ? "italic text-ink-dim" : ""}`}>
          {b.speakerName && (
            <span
              className="mr-2 font-display"
              style={{ color: b.kind === "user" ? "var(--ink-dim)" : (b.speakerId && characters[b.speakerId]?.color) || "var(--gold)" }}
            >
              {b.speakerName}
            </span>
          )}
          {b.text}
        </p>
      ))}
      <div className="mt-1 flex gap-3 text-xs text-ink-dim sm:opacity-0 sm:group-hover:opacity-100">
        {message.variants.length > 1 && (
          <span>
            version {message.activeVariant + 1}/{message.variants.length}
          </span>
        )}
        <button
          type="button"
          disabled={streaming}
          className="hover:text-gold disabled:opacity-40"
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
          className="hover:text-danger disabled:opacity-40"
          onClick={() => {
            if (confirm("Delete this message?")) deleteMessage(message.id);
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
  useEffect(() => endRef.current?.scrollIntoView(), []);
  return (
    <PanelShell title="Backlog">
      <div className="space-y-1">
        {messages.length === 0 && <p className="text-sm text-ink-dim">Nothing yet.</p>}
        {messages.map((m) => (
          <MessageBlock key={m.id} message={m} />
        ))}
        <div ref={endRef} />
      </div>
    </PanelShell>
  );
}
