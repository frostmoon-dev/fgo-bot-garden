import { describe, expect, it } from "vitest";
import { selectForSummary } from "../select";

const msgs = Array.from({ length: 10 }, (_, i) => ({ order: i, role: "user" as const, content: "x".repeat(350) }));

describe("selectForSummary", () => {
  it("does nothing under budget", () => {
    expect(selectForSummary(msgs, -1, 5000, 4).toSummarize).toEqual([]);
  });

  it("summarizes all but the last keepRecent messages when over budget", () => {
    const { toSummarize, recent } = selectForSummary(msgs, -1, 500, 4);
    expect(toSummarize.map((m) => m.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(recent.map((m) => m.order)).toEqual([6, 7, 8, 9]);
  });

  it("skips messages already summarized", () => {
    const { recent } = selectForSummary(msgs, 7, 100000, 4);
    expect(recent.map((m) => m.order)).toEqual([8, 9]);
  });
});
