import { describe, expect, it } from "vitest";
import { ScriptParser, userAliases } from "../scriptParser";
import { makeCtx } from "./fixtures";

// The characters never speak as the user, and the narration never speaks or decides for them.
describe("ScriptParser — never writes for the user", () => {
  it("drops tags that name the user another way", () => {
    const { ctx } = makeCtx({ userName: "Ritsuka Fujimaru", userAliases: ["Master"] });
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("[Ritsuka|smile] Let's go.")).toEqual([]);
    expect(parser.parseLine("[Fujimaru|smile] Let's go.")).toEqual([]);
    expect(parser.parseLine("[You|smile] Let's go.")).toEqual([]);
    expect(parser.parseLine("Master: Let's go.")).toEqual([]);
    expect(parser.parseLine("[BB|smirk] Fufu.")).toHaveLength(1);
  });

  it("drops a quote the prose gives to the user, keeps the character's", () => {
    const { ctx } = makeCtx();
    const lines = new ScriptParser(ctx).parseLine('Ritsuka looks up and says, "I\'m fine." BB grins. "Good."');
    expect(lines).toEqual([
      { type: "narration", text: "BB grins." },
      { type: "dialogue", characterId: "bb", name: "BB", expression: "", text: "Good." },
    ]);
  });

  it("reads the speech tag after a quote", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine('"Fine," Ritsuka says. BB laughs.')).toEqual([{ type: "narration", text: "BB laughs." }]);
    expect(parser.parseLine('"Fine," you reply quietly.')).toEqual([]);
    expect(parser.parseLine('"Hey, Senpai~" BB waves.')[0]).toMatchObject({ type: "dialogue", characterId: "bb" });
    expect(parser.parseLine('"Hmph," says Oberon.')[0]).toMatchObject({ type: "dialogue", characterId: "oberon" });
  });

  it("doesn't mistake the user as a listener for the speaker", () => {
    const { ctx } = makeCtx();
    const lines = new ScriptParser(ctx).parseLine('You watch BB closely. "What? Is there something on my face?"');
    expect(lines.at(-1)).toMatchObject({ type: "dialogue", characterId: "bb" });
  });

  it("drops narration that speaks or decides for the user", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("(narration) Ritsuka agrees to follow her. BB beams.")).toEqual([{ type: "narration", text: "BB beams." }]);
    expect(parser.parseLine('(narration) "Wait!" Ritsuka shouts. The door slams.')).toEqual([
      { type: "narration", text: "The door slams." },
    ]);
    expect(parser.parseLine("(narration) You finally decide to stay.")).toEqual([]);
    // Words inside a character's quote are not the user speaking.
    expect(parser.parseLine('(narration) "Do you agree?" she asks.')).toEqual([{ type: "narration", text: '"Do you agree?" she asks.' }]);
    // Actions the user took are fine to describe.
    expect(parser.parseLine("(narration) Ritsuka's hand is warm in hers.")).toHaveLength(1);
  });

  it("reads a dialogue tag written in the wrong brackets", () => {
    const { ctx } = makeCtx({ characters: [{ id: "oberon", name: "Oberon", aliases: [], expressions: ["neutral", "serious"] }], mainCharacterId: "oberon" });
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("(Oberon|serious) You should have stayed put.")).toEqual([
      { type: "dialogue", characterId: "oberon", name: "Oberon", expression: "serious", text: "You should have stayed put." },
    ]);
    expect(parser.parseLine("{Oberon|serious} Hm.")[0]).toMatchObject({ expression: "serious", text: "Hm." });
    expect(parser.parseLine("[Oberon|serious) Hm.")[0]).toMatchObject({ expression: "serious", text: "Hm." });
    expect(parser.parseLine("Well. (Oberon|neutral) Fine.")).toHaveLength(2);
    // Without a "|" it is still an action.
    expect(parser.parseLine("(smiles faintly)")).toEqual([{ type: "narration", text: "smiles faintly" }]);
  });

  it("splits a persona's nicknames", () => {
    expect(userAliases("Senpai / Master")).toEqual(["Senpai", "Master"]);
    expect(userAliases("Senpai or Master, Ritsuka")).toEqual(["Senpai", "Master", "Ritsuka"]);
    expect(userAliases("")).toEqual([]);
  });
});

describe("lone asterisks", () => {
  it("still marks an action in the AI's text", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("[BB|smirk] Hello *waves")).toEqual([
      { type: "dialogue", characterId: "bb", name: "BB", expression: "smirk", text: "Hello" },
      { type: "narration", text: "waves" },
    ]);
    expect(parser.parseLine("She smiles.*")).toEqual([{ type: "narration", text: "She smiles." }]);
  });
});

describe("departures", () => {
  const exits = (line: string) =>
    new ScriptParser(makeCtx().ctx).parseLine(line).filter((l) => l.type === "exit").map((l) => (l as { characterId: string }).characterId);

  it("turns narrated exits into exit commands", () => {
    expect(exits("(narration) BB waves and heads out.")).toEqual(["bb"]);
    expect(exits("(narration) With a sigh, Oberon leaves the room.")).toEqual(["oberon"]);
    expect(exits("(narration) BB and Oberon walk away together.")).toEqual(["bb", "oberon"]);
    expect(exits("(narration) Oberon vanished.")).toEqual(["oberon"]);
  });

  it("ignores lines where nobody actually leaves", () => {
    expect(exits("(narration) BB leaves a note on the desk.")).toEqual([]);
    expect(exits("(narration) Oberon watches as BB walks out.")).toEqual([]);
    expect(exits("(narration) BB almost leaves.")).toEqual([]);
    expect(exits("(narration) BB's smile vanishes.")).toEqual([]);
    expect(exits('(narration) "I\'m leaving," BB says, but she stays.')).toEqual([]);
  });
});
