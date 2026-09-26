import { describe, expect, it } from "vitest";
import { makeCtx } from "@/lib/parser/__tests__/fixtures";
import { buildBeats, initialStage } from "@/lib/stage";
import { formerCast, presentIds, withoutPresent } from "../story/formerCast";

const bb = { id: "bb", name: "BB", aliases: ["BB-chan"] };
const oberon = { id: "oberon", name: "Oberon", aliases: ["Vortigern"] };
const jeanne = { id: "jalter", name: "Jeanne Alter", aliases: [] };

describe("characters taken out of a story", () => {
  it("finds cast members who left but still speak in the history", () => {
    const history = ["[BB|smirk] Hi, Senpai.", "(Oberon sighs.)", "[Oberon|neutral] Go away."];
    expect(formerCast(history, [bb, oberon, jeanne], new Set(["oberon"]))).toEqual([bb]);
    // Never in the story: not reported.
    expect(formerCast(history, [bb, oberon, jeanne], new Set(["oberon", "bb"]))).toEqual([]);
  });

  it("takes them out of the scene box's Present line, aliases included", () => {
    const scene = "Location: Shiru's room\nPresent: BB-chan, Oberon and Shiru\nMood: tense";
    expect(withoutPresent(scene, [bb])).toBe("Location: Shiru's room\nPresent: Oberon, Shiru\nMood: tense");
  });

  it("reads who is present, skipping anyone said to be gone", () => {
    expect(presentIds("Present: BB, Shiru", [bb, oberon])).toEqual(new Set(["bb"]));
    expect(presentIds("Present: Shiru, Oberon (has left)", [bb, oberon])).toEqual(new Set());
    expect(presentIds("**Present:** Vortigern", [bb, oberon])).toEqual(new Set(["oberon"]));
    expect(presentIds("Location: somewhere", [bb, oberon])).toBeNull();
  });
});

describe("the stage follows who is present", () => {
  const { ctx } = makeCtx();
  const narrative = { mode: "narrative" as const, mainCharacterId: "bb" };
  const macros = { user: "Ritsuka", char: "BB" };
  const onStage = (stage: ReturnType<typeof initialStage>) =>
    Object.values(stage.slots)
      .filter(Boolean)
      .map((s) => s!.characterId)
      .sort();

  it("drops silent sprites the scene box doesn't list, from the latest reply on", () => {
    const messages = [
      { id: "1", role: "assistant" as const, content: "{enter:Oberon:left}\n[BB|neutral] Hello." },
      { id: "2", role: "user" as const, content: "*wakes up alone*" },
      { id: "3", role: "assistant" as const, content: "[BB|smirk] Morning!" },
    ];
    const present = buildBeats(messages, ctx, narrative, initialStage(null, "bb"), macros, "Ritsuka", new Set(["bb"]));
    expect(onStage(present.finalStage)).toEqual(["bb"]);
    const unknown = buildBeats(messages, ctx, narrative, initialStage(null, "bb"), macros, "Ritsuka", null);
    expect(onStage(unknown.finalStage)).toEqual(["bb", "oberon"]);
  });

  it("takes a character off the stage when the user's own action says they left", () => {
    const messages = [
      { id: "1", role: "assistant" as const, content: "{enter:Oberon:left}\n[BB|neutral] Hello." },
      { id: "2", role: "user" as const, content: "*I look around. Oberon is gone.*" },
    ];
    const { finalStage } = buildBeats(messages, ctx, narrative, initialStage(null, "bb"), macros, "Ritsuka");
    expect(onStage(finalStage)).toEqual(["bb"]);
  });

  it("keeps a character whose leaving is denied", () => {
    const { ctx: c } = makeCtx();
    const lines = buildBeats(
      [{ id: "1", role: "assistant" as const, content: "{enter:Oberon:left}\n(Oberon didn't leave the room.)" }],
      c,
      narrative,
      initialStage(null, "bb"),
      macros,
      "Ritsuka",
    );
    expect(onStage(lines.finalStage)).toEqual(["bb", "oberon"]);
  });
});
