"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const format = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

// "just now", "12 minutes ago", "yesterday", then the date.
function ago(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return relative.format(-days, "day");
  return shortDate.format(date);
}

// The server doesn't know the viewer's locale or time zone, so it renders the plain date
// and the browser fills in the local time after hydration. This avoids a hydration mismatch.
export function LocalTime({ iso, className, relative: asAgo = false }: { iso: string; className?: string; relative?: boolean }) {
  const label = useSyncExternalStore(
    subscribe,
    () => (asAgo ? ago(new Date(iso)) : format.format(new Date(iso))),
    () => iso.slice(0, 10),
  );
  const full = useSyncExternalStore(
    subscribe,
    () => format.format(new Date(iso)),
    () => iso,
  );
  return (
    <time dateTime={iso} title={asAgo ? full : undefined} className={className}>
      {label}
    </time>
  );
}
