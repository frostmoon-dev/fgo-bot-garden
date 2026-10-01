import type { ChatUsage } from "./types";

// What each AI request is for, as the Usage page groups them.
export type UsagePurpose = "reply" | "scene" | "choices" | "summary" | "memory" | "write" | "interlude" | "test" | "other";

export interface UsageEntry {
  purpose: UsagePurpose;
  model: string;
  // Null when the provider didn't report token counts.
  usage: ChatUsage | null;
}

// The client reports every finished request here; lib/usage.ts saves them. Kept apart so the client works
// (and is tested) without a database.
let sink: ((entry: UsageEntry) => void) | null = null;

export function onUsageReport(fn: (entry: UsageEntry) => void) {
  sink = fn;
}

export function reportUsage(entry: UsageEntry) {
  try {
    sink?.(entry);
  } catch {
    // Counting tokens must never break a reply.
  }
}
