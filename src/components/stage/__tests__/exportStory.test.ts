import { describe, expect, it } from "vitest";
import type { Beat } from "@/lib/stage/beats";
import { storyFileName, storyText } from "../exportStory";

const stage = (backgroundKey: string | null) => ({ backgroundKey, slots: { left: null, center: null, right: null } });
const beat = (b: Partial<Beat> & Pick<Beat, "messageId" | "kind" | "text">): Beat => ({
  key: `${b.messageId}:${b.text}`,
  role: "assistant",
  speakerId: null,
  speakerName: null,
  stage: stage("canteen"),
  ...b,
});

describe("storyText", () => {
  it("writes names, narration, thoughts and place changes as plain text", () => {
    const text = storyText(
      "Oberon — Canteen",
      [
        beat({ messageId: "a", kind: "narration", text: "The canteen is quiet." }),
        beat({ messageId: "a", kind: "dialogue", speakerName: "Oberon", text: "Oh. You again." }),
        beat({ messageId: "a", kind: "narration", text: "How tiresome.", thinker: { id: "o", name: "Oberon" } }),
        beat({ messageId: "b", kind: "user", role: "user", speakerName: "Ritsuka", text: "Good evening." }),
        beat({ messageId: "c", kind: "narration", text: "Later.", stage: stage("hall") }),
      ],
      (key) => (key === "canteen" ? "Chaldea Canteen" : "Main Hall"),
      new Date("2026-10-01T12:00:00Z"),
    );
    expect(text).toBe(
      [
        "Oberon — Canteen",
        "Saved 1 October 2026",
        "",
        "— Chaldea Canteen —",
        "",
        "The canteen is quiet.",
        "Oberon: Oh. You again.",
        "(Oberon, thinking) How tiresome.",
        "",
        "Ritsuka: Good evening.",
        "",
        "— Main Hall —",
        "",
        "Later.",
        "",
      ].join("\n"),
    );
  });

  it("makes a safe file name", () => {
    expect(storyFileName("Oberon — Interlude 1: Cold Tea")).toBe("Oberon-Interlude-1-Cold-Tea.txt");
    expect(storyFileName("???")).toBe("story.txt");
  });
});
