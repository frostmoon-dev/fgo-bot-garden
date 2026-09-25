import { describe, expect, it } from "vitest";
import { makeCtx } from "@/lib/parser/__tests__/fixtures";
import { applyLine, buildBeats, emptyStage, initialStage } from "..";

const narrative = { mode: "narrative" as const, mainCharacterId: "bb" };

describe("applyLine", () => {
  it("sets the background on scene", () => {
    const s = applyLine(emptyStage(null), { type: "scene", backgroundKey: "moon_cell" }, narrative);
    expect(s.backgroundKey).toBe("moon_cell");
  });

  it("moves a character who enters again", () => {
    let s = initialStage(null, "bb");
    s = applyLine(s, { type: "enter", characterId: "bb", position: "left" }, narrative);
    expect(s.slots.center).toBeNull();
    expect(s.slots.left).toEqual({ characterId: "bb", expression: "neutral" });
  });

  it("auto-enters a speaker who is not on stage", () => {
    let s = initialStage(null, "bb");
    s = applyLine(
      s,
      { type: "dialogue", characterId: "oberon", name: "Oberon", expression: "smile", text: "Hi" },
      narrative,
    );
    expect(s.slots.left).toEqual({ characterId: "oberon", expression: "smile" });
  });

  it("keeps the expression for untagged lines", () => {
    let s = initialStage(null, "bb");
    s = applyLine(s, { type: "dialogue", characterId: "bb", name: "BB", expression: "smirk", text: "a" }, narrative);
    s = applyLine(s, { type: "dialogue", characterId: "bb", name: "BB", expression: "", text: "b" }, narrative);
    expect(s.slots.center?.expression).toBe("smirk");
  });

  it("removes a character on exit", () => {
    const s = applyLine(initialStage(null, "bb"), { type: "exit", characterId: "bb" }, narrative);
    expect(s.slots.center).toBeNull();
  });

  it("keeps only the main character in dialogue mode", () => {
    const opts = { mode: "dialogue" as const, mainCharacterId: "bb" };
    let s = emptyStage(null);
    s = applyLine(s, { type: "dialogue", characterId: "bb", name: "BB", expression: "angry", text: "!" }, opts);
    expect(s.slots).toEqual({ left: null, right: null, center: { characterId: "bb", expression: "angry" } });
  });
});

describe("buildBeats", () => {
  it("creates text beats with the stage at that moment", () => {
    const { ctx } = makeCtx();
    const { beats, finalStage } = buildBeats(
      [
        { id: "m1", role: "assistant", content: "{scene:moon_cell}\n[BB|smirk] Hi {{user}}.\n{exit:BB}" },
        { id: "m2", role: "user", content: "Hello." },
      ],
      ctx,
      narrative,
      initialStage(null, "bb"),
      { user: "Ritsuka", char: "BB" },
      "Ritsuka",
    );
    expect(beats.map((b) => [b.kind, b.text])).toEqual([
      ["dialogue", "Hi Ritsuka."],
      ["user", "Hello."],
    ]);
    expect(beats[0].stage.backgroundKey).toBe("moon_cell");
    expect(beats[0].stage.slots.center?.expression).toBe("smirk");
    expect(finalStage.slots.center).toBeNull();
  });
});
