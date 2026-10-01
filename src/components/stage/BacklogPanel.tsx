"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { branchStory } from "@/app/actions/sessions";
import { unwrap } from "@/lib/actionResult";
import { activeContent, type MessageView } from "@/lib/types";
import { ColorDot } from "@/components/ui/ColorDot";
import { PanelShell } from "./PanelShell";
import { usePlay, usePlayApi } from "./usePlay";
import { askConfirm } from "@/components/ui/dialogs";

function MessageBlock({ message, seen }: { message: MessageView; seen: Set<string> | null }) {
  const beats = usePlay((s) => s.scene.beats);
  const characters = usePlay((s) => s.characters);
  const streaming = usePlay((s) => s.streaming);
  const sessionId = usePlay((s) => s.session.id);
  const { editMessage, deleteMessage, togglePin, replay, showToast } = usePlayApi().getState();
  const router = useRouter();
  const [branching, setBranching] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // Only lines already read: a reply that is still playing isn't spoiled.
  const lines = beats.filter((b) => b.messageId === message.id && (!seen || seen.has(b.key)));

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
        <p key={b.key} className={`vn-log-line leading-relaxed [&+p]:mt-2 ${b.kind === "narration" ? "vn-narration" : ""}`}>
          {b.speakerName && (
            <span className="vn-log-name mr-2 inline-flex items-center gap-1.5 font-name font-bold">
              {b.kind !== "user" && b.speakerId && characters[b.speakerId] && <ColorDot color={characters[b.speakerId].color} />}
              {b.speakerName}
            </span>
          )}
          {b.text}
        </p>
      ))}
      <div className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {message.variants.length > 1 && (
          <span className="mr-2">
            version {message.activeVariant + 1}/{message.variants.length}
          </span>
        )}
        <button
          type="button"
          disabled={streaming}
          className="min-h-10 rounded-lg px-2 hover:bg-raised hover:text-ink disabled:opacity-40"
          title="Close the log and play the story again from this message"
          onClick={() => replay(message.id)}
        >
          Replay
        </button>
        <button
          type="button"
          disabled={streaming || message.id.startsWith("temp")}
          className="min-h-10 rounded-lg px-2 hover:bg-raised hover:text-ink disabled:opacity-40"
          title="Pinned messages stay in the AI's memory, even after the story is summarized."
          onClick={() => togglePin(message.id)}
        >
          {message.pinned ? "Unpin" : "Pin"}
        </button>
        <button
          type="button"
          disabled={streaming || branching || message.id.startsWith("temp")}
          className="min-h-10 rounded-lg px-2 hover:bg-raised hover:text-ink disabled:opacity-40"
          title="Start a new story from this message: everything up to here is copied, and this story stays as it is"
          onClick={async () => {
            setBranching(true);
            try {
              router.push(`/play/${unwrap(await branchStory(sessionId, message.id))}`);
            } catch (e) {
              showToast(e instanceof Error ? e.message : "Could not branch the story");
              setBranching(false);
            }
          }}
        >
          {branching ? <span className="shimmer">Branching…</span> : "Branch"}
        </button>
        <button
          type="button"
          disabled={streaming}
          className="min-h-10 rounded-lg px-2 hover:bg-raised hover:text-ink disabled:opacity-40"
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
          className="min-h-10 rounded-lg px-2 hover:bg-danger/10 hover:text-danger disabled:opacity-40"
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
  const allMessages = usePlay((s) => s.messages);
  const stageBeats = usePlay((s) => s.scene.stageBeats);
  const readUpTo = usePlay((s) => s.readUpTo);
  // Lines up to the furthest one read, and the messages they belong to. Messages after that aren't shown yet.
  const read = stageBeats.slice(0, readUpTo + 1);
  const seen = readUpTo >= stageBeats.length - 1 ? null : new Set(read.map((b) => b.key));
  const lastRead = allMessages.findIndex((m) => m.id === read.at(-1)?.messageId);
  const messages = seen && lastRead >= 0 ? allMessages.slice(0, lastRead + 1) : allMessages;
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
          <MessageBlock key={m.id} message={m} seen={seen} />
        ))}
        <div ref={endRef} />
      </div>
    </PanelShell>
  );
}
