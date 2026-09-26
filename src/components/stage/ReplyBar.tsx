"use client";

import { useEffect, useRef, useState } from "react";
import { asAction } from "@/lib/userInput";
import { usePlay } from "./usePlay";

// One box for everything you do: plain text is spoken, *asterisks* are actions.
export function ReplyBar({ userName }: { userName: string }) {
  const [text, setText] = useState("");
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
    void send(text);
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
      className="vn-box vn-lane mx-auto mt-3 flex w-full max-w-[52rem] flex-wrap items-end gap-2 p-2 focus-within:ring-2 focus-within:ring-accent/50 sm:flex-nowrap"
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
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
        onClick={() => void suggestChoices()}
        disabled={choicesBusy || hasChoices}
        title="Suggest three things you could do next"
        className="btn btn-outline shrink-0"
      >
        {choicesBusy ? <span className="shimmer">Thinking…</span> : "Choices"}
      </button>
      <button
        type="submit"
        className="btn btn-primary ml-auto shrink-0 px-5 sm:ml-0"
        title={text.trim() ? "Send (Enter)" : "Let the story continue without you"}
      >
        {text.trim() ? "Send" : "Continue"}
      </button>
    </form>
  );
}
