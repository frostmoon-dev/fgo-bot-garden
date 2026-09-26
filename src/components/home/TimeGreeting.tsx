"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function greeting(hour: number): string {
  if (hour < 5) return "Still awake";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Uses the viewer's clock, so it renders after hydration (the server does not know the time zone).
export function TimeGreeting({ name }: { name: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => `${greeting(new Date().getHours())}, ${name}.`,
    () => `Welcome back, ${name}.`,
  );
  return <>{text}</>;
}
