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
      className="mx-auto mt-2 flex w-full max-w-5xl items-end gap-2"
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={ref}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={`${userName}'s reply… (Enter to send, empty = continue)`}
        className="field max-h-40 min-h-[3em] flex-1 resize-y bg-night/90 text-[1em]"
      />
      <button type="submit" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-night">
        {text.trim() ? "Send" : "Continue"}
      </button>
    </form>
  );
}
