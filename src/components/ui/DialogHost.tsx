"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDialogs, type DialogRequest } from "./dialogs";

// Draws askConfirm() and askText() dialogs: the story screen's message window (or a plain box with Simple
// frames) with its title on the blue name tab. Esc cancels, Enter confirms.
export function DialogHost() {
  const current = useDialogs((s) => s.current);
  if (!current) return null;
  return <Dialog key={current.id} request={current} />;
}

function Dialog({ request }: { request: DialogRequest }) {
  const titleId = useId();
  const bodyId = useId();
  const [text, setText] = useState(request.kind === "text" ? (request.initial ?? "") : "");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const danger = request.kind === "confirm" && request.danger;

  // Focus the safe choice for destructive actions, and give focus back to whatever opened the dialog.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    if (request.kind === "text") inputRef.current?.select();
    else (danger ? cancelRef : confirmRef).current?.focus();
    return () => opener?.focus?.();
  }, [request.kind, danger]);

  const close = (ok: boolean) => {
    useDialogs.setState({ current: null });
    if (request.kind === "confirm") request.resolve(ok);
    else request.resolve(ok ? text.trim() : null);
  };

  return (
    <div
      className="fade-in fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-4 [--fade:150ms] sm:items-center"
      onClick={() => close(false)}
      onKeyDown={(e) => {
        // Keys stay inside the dialog, so the story screen behind it doesn't react.
        e.stopPropagation();
        if (e.key === "Escape") close(false);
        if (e.key === "Tab") {
          // Keep focus inside the dialog.
          const items = [inputRef.current, cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[];
          const at = items.indexOf(document.activeElement as HTMLElement);
          const next = items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length];
          e.preventDefault();
          next?.focus();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={request.kind === "confirm" ? bodyId : undefined}
        className="vn-box vn-dialog w-full max-w-md px-6 pb-5 pt-9 sm:px-7"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="tab-heading vn-dialog-title max-w-[calc(100%-1rem)] truncate">
          {request.title}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            close(true);
          }}
        >
          {request.kind === "confirm" ? (
            <p id={bodyId} className="leading-relaxed">
              {request.body}
            </p>
          ) : (
            <label className="block">
              <span className="text-sm text-muted">{request.label}</span>
              <input
                ref={inputRef}
                className="field mt-2"
                value={text}
                maxLength={request.maxLength}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button ref={cancelRef} type="button" className="btn btn-outline" onClick={() => close(false)}>
              Cancel
            </button>
            <button ref={confirmRef} type="submit" className={`btn ${danger ? "btn-danger-solid" : "btn-primary"}`}>
              {request.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
