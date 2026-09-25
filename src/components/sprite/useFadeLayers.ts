"use client";

import { useEffect, useState } from "react";

export interface FadeLayer<T> {
  key: string;
  value: T;
  leaving: boolean;
}

// Keeps the previous value on screen for `duration` ms after the key changes, so it can fade.
export function useFadeLayers<T>(value: T | null, key: string | null, duration = 350): FadeLayer<T>[] {
  const [prevKey, setPrevKey] = useState(key);
  const [leaving, setLeaving] = useState<FadeLayer<T>[]>([]);
  const [lastValue, setLastValue] = useState(value);

  if (key !== prevKey) {
    setPrevKey(key);
    setLeaving((ls) => [
      ...ls.filter((l) => l.key !== key),
      ...(prevKey !== null && lastValue !== null ? [{ key: prevKey, value: lastValue, leaving: true }] : []),
    ]);
  }
  if (value !== lastValue) setLastValue(value);

  useEffect(() => {
    if (!leaving.length) return;
    const t = setTimeout(() => setLeaving([]), duration);
    return () => clearTimeout(t);
  }, [leaving, duration]);

  const current = key !== null && value !== null ? [{ key, value, leaving: false }] : [];
  return [...leaving.filter((l) => l.key !== key), ...current];
}
