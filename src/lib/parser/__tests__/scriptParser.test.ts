import { describe, expect, it } from "vitest";
import { ScriptParser } from "../scriptParser";
import { makeCtx } from "./fixtures";

describe("ScriptParser — dialogue", () => {
  it("parses name, expression and text", () => {
    const { ctx, warnings } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("[BB|smirk] Hello, senpai.")).toEqual([
      { type: "dialogue", characterId: "bb", name: "BB", expression: "smirk", text: "Hello, senpai." },
    ]);
    expect(warnings).toEqual([]);
  });

  it("matches names, aliases and expressions case-insensitively", () => {
    const { ctx } = makeCtx();
    const [line] = new ScriptParser(ctx).parseLine("[vortigern | SMILE] Hm.");
    expect(line).toMatchObject({ characterId: "oberon", name: "Oberon", expression: "smile" });
  });

  it("uses neutral and warns for an unknown expression", () => {
    const { ctx, warnings } = makeCtx();
    const [line] = new ScriptParser(ctx).parseLine("[BB|confused] Eh?");
    expect(line).toMatchObject({ expression: "neutral", text: "Eh?" });
    expect(warnings[0]).toMatch(/Unknown expression "confused"/);
  });

  it("uses neutral when the tag has no expression", () => {
    const { ctx, warnings } = makeCtx();
    const [line] = new ScriptParser(ctx).parseLine("[BB] Hi.");
    expect(line).toMatchObject({ expression: "neutral" });
    expect(warnings).toEqual([]);
  });

  it("keeps the text of an unknown character without a sprite", () => {
    const { ctx, warnings } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("[Stranger|smile] Who are you?")).toEqual([
      { type: "dialogue", characterId: null, name: "Stranger", expression: "neutral", text: "Who are you?" },
    ]);
    expect(warnings[0]).toMatch(/Unknown character "Stranger"/);
  });

  it("drops lines written for the user's character", () => {
    const { ctx, warnings } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("[Ritsuka|neutral] I agree.")).toEqual([]);
    expect(parser.parseLine("[{{user}}] Sure.")).toEqual([]);
    expect(warnings).toHaveLength(2);
  });

  it("allows an empty text (expression change only)", () => {
    const { ctx } = makeCtx();
    const [line] = new ScriptParser(ctx).parseLine("[BB|angry]");
    expect(line).toMatchObject({ type: "dialogue", expression: "angry", text: "" });
  });
});

describe("ScriptParser — untagged text", () => {
  it("belongs to the main character when nobody has spoken", () => {
    const { ctx } = makeCtx();
    const [line] = new ScriptParser(ctx).parseLine("Just talking.");
    expect(line).toMatchObject({ type: "dialogue", characterId: "bb", expression: "", text: "Just talking." });
  });

  it("belongs to the last speaker", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    parser.parseLine("[Oberon|smile] First.");
    expect(parser.parseLine("Second.")[0]).toMatchObject({ characterId: "oberon", text: "Second." });
  });

  it("ignores blank lines", () => {
    const { ctx } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("   ")).toEqual([]);
  });
});

describe("ScriptParser — narration", () => {
  it("parses (narration) lines", () => {
    const { ctx } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("(narration) The lights flicker.")).toEqual([
      { type: "narration", text: "The lights flicker." },
    ]);
  });

  it("treats a fully wrapped (…) or *…* line as narration", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("(She sighs.)")).toEqual([{ type: "narration", text: "She sighs." }]);
    expect(parser.parseLine("*She sighs.*")).toEqual([{ type: "narration", text: "She sighs." }]);
  });

  it("drops narration where the user's character acts, and what carries on about them", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(
      parser.parseLine("(Ritsuka looks up from her desk, blinking at Oberon. She sets down her pen and rubs her eyes.)"),
    ).toEqual([]);
    expect(parser.parseLine("(With a sigh, you nod.)")).toEqual([]);
    expect(parser.parseLine("(Ritsuka yawns. BB giggles.)")).toEqual([{ type: "narration", text: "BB giggles." }]);
    // The user as the object, or something of theirs, is fine.
    expect(parser.parseLine("(Oberon hands Ritsuka a cup.)")).toEqual([{ type: "narration", text: "Oberon hands Ritsuka a cup." }]);
    expect(parser.parseLine("(Ritsuka's phone buzzes.)")).toEqual([{ type: "narration", text: "Ritsuka's phone buzzes." }]);
  });
});

describe("ScriptParser — commands", () => {
  it("parses scene with a known background", () => {
    const { ctx } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("{scene:moon_cell}")).toEqual([
      { type: "scene", backgroundKey: "moon_cell" },
    ]);
  });

  it("ignores an unknown background", () => {
    const { ctx, warnings } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("{scene:beach}")).toEqual([]);
    expect(warnings[0]).toMatch(/Unknown background "beach"/);
  });

  it("parses enter with a position", () => {
    const { ctx } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("{enter:Oberon:left}")).toEqual([
      { type: "enter", characterId: "oberon", position: "left" },
    ]);
  });

  it("uses center for a missing or invalid position", () => {
    const { ctx, warnings } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("{enter:BB}")[0]).toMatchObject({ position: "center" });
    expect(parser.parseLine("{enter:BB:top}")[0]).toMatchObject({ position: "center" });
    expect(warnings).toHaveLength(2);
  });

  it("parses exit", () => {
    const { ctx } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("{exit:BB-chan}")).toEqual([{ type: "exit", characterId: "bb" }]);
  });

  it("reads commands written without braces instead of showing them", () => {
    const { ctx } = makeCtx({
      characters: [...makeCtx().ctx.characters, { id: "jalter", name: "Jeanne Alter", aliases: [], expressions: ["neutral"] }],
    });
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("(JeanneAlter enters:right)")).toEqual([{ type: "enter", characterId: "jalter", position: "right" }]);
    expect(parser.parseLine("(Enter:Oberon:left)")).toEqual([{ type: "enter", characterId: "oberon", position: "left" }]);
    // The user's character has no sprite: dropped, never shown as narration.
    expect(parser.parseLine("(Enter:Ritsuka:center)")).toEqual([]);
    expect(parser.parseLine("Exit: BB")).toEqual([{ type: "exit", characterId: "bb" }]);
    // Ordinary narration stays narration (and brings Oberon on stage if he isn't there yet).
    expect(parser.parseLine("(Oberon enters the room.)")).toEqual([
      { type: "arrive", characterId: "oberon" },
      { type: "narration", text: "Oberon enters the room." },
    ]);
  });

  it("ignores enter/exit for an unknown character", () => {
    const { ctx, warnings } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("{enter:Gilgamesh:right}")).toEqual([]);
    expect(parser.parseLine("{exit:Gilgamesh}")).toEqual([]);
    expect(warnings).toHaveLength(2);
  });

  it("ignores unknown command types", () => {
    const { ctx, warnings } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("{sound:battle}")).toEqual([]);
    expect(warnings[0]).toMatch(/unknown command/);
  });

  it("handles commands before and after text on one line", () => {
    const { ctx } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("{enter:Oberon:right} [Oberon|smile] Hello. {exit:BB}")).toEqual([
      { type: "enter", characterId: "oberon", position: "right" },
      { type: "dialogue", characterId: "oberon", name: "Oberon", expression: "smile", text: "Hello." },
      { type: "exit", characterId: "bb" },
    ]);
  });
});

describe("ScriptParser — dialogue mode", () => {
  it("drops narration and all commands", () => {
    const { ctx, warnings } = makeCtx({ mode: "dialogue" });
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("(narration) Rain.")).toEqual([]);
    expect(parser.parseLine("{scene:moon_cell}")).toEqual([]);
    expect(parser.parseLine("{enter:Oberon:left}")).toEqual([]);
    expect(parser.parseLine("{exit:BB}")).toEqual([]);
    expect(warnings).toHaveLength(4);
  });

  it("keeps dialogue", () => {
    const { ctx } = makeCtx({ mode: "dialogue" });
    expect(new ScriptParser(ctx).parseLine("[BB|smirk] Fufu.")).toHaveLength(1);
  });
});

describe("ScriptParser — parseText", () => {
  it("parses a full multi-line reply", () => {
    const { ctx } = makeCtx();
    const lines = new ScriptParser(ctx).parseText(
      "{scene:chaldea_hall}\n(narration) Quiet.\n[BB|smirk] Senpai~\nStill me.\n",
    );
    expect(lines.map((l) => l.type)).toEqual(["scene", "narration", "dialogue", "dialogue"]);
    expect(lines[3]).toMatchObject({ characterId: "bb", text: "Still me." });
  });
});
