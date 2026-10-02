import { describe, expect, it } from "vitest";
import { findRepetition, repetitionNote } from "../repetition";

describe("findRepetition", () => {
  it("finds a phrase that comes back in several replies", () => {
    const replies = [
      "[BB|neutral] Hello.\n(narration) BB waits, eyes locked on Shiru, expecting a reaction.",
      "[BB|smug] The show goes on.\n(narration) BB waits, eyes locked on Shiru, expecting a reply.",
    ];
    const { phrases } = findRepetition(replies);
    expect(phrases).toEqual(["bb waits eyes locked on shiru expecting a"]);
  });

  it("finds a topic every recent reply returns to, unless the user brought it up", () => {
    const replies = [
      "[BB|neutral] About that melon bread...",
      "[BB|smug] I can smell the bread from here.",
      "[BB|playful] Share the bread, Senpai!",
      "(narration) The bread sits on the table.",
    ];
    expect(findRepetition(replies).topics).toEqual(["bread"]);
    expect(findRepetition(replies, "Do you want some bread?").topics).toEqual([]);
  });

  it("ignores character names and tags", () => {
    const replies = ["[Oberon|smile] Oberon hums.", "[Oberon|bored] Oberon sighs.", "[Oberon|sly] Oberon grins.", "[Oberon|neutral] Oberon waves."];
    expect(findRepetition(replies, "", ["Oberon"]).topics).toEqual([]);
  });

  it("shortens a whole repeated reply to its start", () => {
    const line = "[BB|smug] If Senpai wants to stand there silently while the whole Moon Cell watches, I will narrate.";
    expect(findRepetition([line, line]).phrases).toEqual(["if senpai wants to stand there silently while…"]);
  });

  it("finds nothing in varied replies", () => {
    const replies = ["[BB|neutral] Welcome to the show!", "[BB|smug] Today we cook pancakes.", "[BB|shy] W-what did you say?"];
    expect(repetitionNote(findRepetition(replies))).toBeNull();
  });
});
