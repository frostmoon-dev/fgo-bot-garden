"use client";

import { useEffect, useRef, useState } from "react";
import { asAction } from "@/lib/userInput";
import { usePlay } from "./usePlay";

// One box for everything you do: plain text is spoken, *asterisks* are actions. Direct adds a note on where
// the next reply should go, outside the story.
export function ReplyBar({ userName }: { userName: string }) {
  const [text, setText] = useState("");
  // The director's note: where the next reply should go, from outside the story. Sent once, never saved.
  const [directing, setDirecting] = useState(false);
  const [direction, setDirection] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const send = usePlay((s) => s.send);
  const suggestChoices = usePlay((s) => s.suggestChoices);
  const choicesBusy = usePlay((s) => s.choicesBusy);
  const hasChoices = usePlay((s) => !!s.choices?.length);

  useEffect(() => {
    // Autofocus on desktop only; on phones it would pop the keyboard over the scene.
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus();
  }, []);

  function submit() {
    setText("");
    setDirection("");
    setDirecting(false);
    void send(text, direction.trim() || undefined);
  }

  // Ctrl+I: the selection (or a new empty action) becomes *an action*.
  function markAction(el: HTMLTextAreaElement) {
    const { selectionStart: a, selectionEnd: b } = el;
    const picked = text.slice(a, b);
    const wrapped = picked.trim() ? asAction(picked) : "**";
    setText(text.slice(0, a) + wrapped + text.slice(b));
    const caret = picked.trim() ? a + wrapped.length : a + 1;
    requestAnimationFrame(() => el.setSelectionRange(caret, caret));
  }

  return (
    <form
      // The direction line takes a row of its own above the box, so the row wraps while it is open.
      className={`vn-box vn-lane mx-auto mt-3 flex w-full max-w-[52rem] flex-wrap items-end gap-2 p-2 focus-within:ring-2 focus-within:ring-accent/50 ${directing ? "" : "sm:flex-nowrap"}`}
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {directing && (
        <label className="flex min-w-0 basis-full items-center gap-2 border-b border-line px-3 pb-2 pt-1">
          <span className="shrink-0 text-sm font-medium text-muted">Direction</span>
          <input
            autoFocus
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDirecting(false);
                ref.current?.focus();
              }
            }}
            maxLength={1000}
            placeholder="Where the next reply should go, e.g. BB gets jealous"
            title="Guides the next reply only. It isn't part of the story and isn't saved."
            className="min-h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>
      )}
      <label className="min-w-0 basis-full sm:basis-auto sm:flex-1">
        <span className="sr-only">What {userName} says or does. Put actions in asterisks.</span>
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            } else if (e.key.toLowerCase() === "i" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              markAction(e.currentTarget);
            }
          }}
          title="Plain text is what you say. *Text in asterisks* is what you do. Ctrl+I marks the selection as an action."
          className="block max-h-40 min-h-11 w-full resize-none bg-transparent px-3 py-2.5 leading-relaxed outline-none placeholder:text-muted focus-visible:outline-none"
        />
      </label>
      <button
        type="button"
        onClick={() => {
          if (directing) setDirection("");
          setDirecting(!directing);
        }}
        aria-pressed={directing}
        title="Add a direction for the next reply: not part of the story, not saved"
        className="btn btn-quiet shrink-0"
      >
        {directing ? "No direction" : "Direct"}
      </button>
      <button
        type="button"
        onClick={() => void suggestChoices()}
        disabled={choicesBusy || hasChoices}
        title="Suggest three things you could do next"
        className="btn btn-outline shrink-0"
      >
        {choicesBusy ? <span className="shimmer">Thinking…</span> : "Choices"}
      </button>
      <button
        type="submit"
        className="vn-send btn btn-primary ml-auto shrink-0 px-5 sm:ml-0"
        title={text.trim() ? "Send (Enter)" : "Let the story continue without you"}
      >
        {text.trim() ? "Send" : "Continue"}
      </button>
    </form>
  );
}
