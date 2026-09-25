"use client";

import { useState, useTransition } from "react";

// Runs a server action and keeps pending/error state for the UI.
export function useAsync() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return { pending, error, setError, run };
}
