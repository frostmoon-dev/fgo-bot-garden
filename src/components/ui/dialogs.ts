"use client";

import { create } from "zustand";

// In-app replacements for the browser's confirm() and prompt(), drawn by <DialogHost /> in the root layout.
// Call them from any client component: `if (await askConfirm({...})) …`.

export interface ConfirmOptions {
  title: string;
  // What will happen, and what will be lost.
  body: string;
  // Says what the button does: "Delete story", not "OK".
  confirmLabel: string;
  // Destructive: the confirm button is red and Cancel gets the focus.
  danger?: boolean;
}

export interface TextOptions {
  title: string;
  label: string;
  initial?: string;
  confirmLabel: string;
  maxLength?: number;
}

export type DialogRequest = { id: number } & (
  | ({ kind: "confirm"; resolve: (ok: boolean) => void } & ConfirmOptions)
  | ({ kind: "text"; resolve: (value: string | null) => void } & TextOptions)
);

type NewRequest = DialogRequest extends infer R ? (R extends DialogRequest ? Omit<R, "id"> : never) : never;
let nextId = 1;

export const useDialogs = create<{ current: DialogRequest | null }>(() => ({ current: null }));

// A new dialog replaces one that is still open, which counts as cancelled.
function open(request: NewRequest) {
  const previous = useDialogs.getState().current;
  if (previous?.kind === "confirm") previous.resolve(false);
  else if (previous) previous.resolve(null);
  useDialogs.setState({ current: { ...request, id: nextId++ } as DialogRequest });
}

export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => open({ kind: "confirm", ...options, resolve }));
}

// Resolves to the text, or null when cancelled.
export function askText(options: TextOptions): Promise<string | null> {
  return new Promise((resolve) => open({ kind: "text", ...options, resolve }));
}
