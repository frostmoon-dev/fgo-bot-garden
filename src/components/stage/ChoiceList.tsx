"use client";

import { asAction } from "@/lib/userInput";
import { usePlay, usePlayApi } from "./usePlay";

// FGO-style choices for your next move: spoken lines as they are, actions in italics. Picking one sends it.
export function ChoiceList() {
  const choices = usePlay((s) => s.choices);
  const { send, clearChoices } = usePlayApi().getState();
  if (!choices?.length) return null;
  return (
    <div className="mx-auto mb-3 flex w-full max-w-[40rem] flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      {choices.map((c, i) => (
        <button
          key={`${c.kind}:${c.text}`}
          type="button"
          style={{ animationDelay: `${i * 70}ms` }}
          onClick={() => void send(c.kind === "do" ? asAction(c.text) : c.text)}
          title={c.kind === "do" ? "Something you do" : "Something you say"}
          className="choice-in vn-box min-h-12 px-5 py-2.5 text-center hover:ring-2 hover:ring-accent/60 focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className={c.kind === "do" ? "vn-action" : ""}>{c.text}</span>
        </button>
      ))}
      <button type="button" onClick={clearChoices} className="min-h-10 self-end rounded-md px-3 text-xs text-white/70 hover:text-white">
        Hide choices
      </button>
    </div>
  );
}
