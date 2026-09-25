"use client";

import { useEffect, useRef, useState } from "react";
import { usePlay } from "./usePlay";

export function ReplyBar({ userName }: { userName: string }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const send = usePlay((s) => s.send);

  useEffect(() => {
    // Autofocus on desktop only; on phones it would pop the keyboard over the scene.
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus();
  }, []);

  function submit() {
    const value = text;
    setText("");
    void send(value);
  }

  return (
    <form
      className="vn-box mx-auto mt-3 flex w-full max-w-[52rem] items-end gap-2 p-2 focus-within:ring-2 focus-within:ring-accent/50"
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="min-w-0 flex-1">
        <span className="sr-only">Your reply as {userName}</span>
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={`Reply as ${userName}…`}
          className="block max-h-40 min-h-11 w-full resize-none bg-transparent px-3 py-2.5 leading-relaxed outline-none placeholder:text-muted focus-visible:outline-none"
        />
      </label>
      <button
        type="submit"
        className="min-h-11 shrink-0 rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent"
        title={text.trim() ? "Send (Enter)" : "Let the story continue without a reply"}
      >
        {text.trim() ? "Send" : "Continue"}
      </button>
    </form>
  );
}
