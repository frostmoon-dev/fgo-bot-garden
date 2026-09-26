import { describe, expect, it } from "vitest";
import { ScriptParser, toScript } from "../scriptParser";
import { makeCtx } from "./fixtures";

// Real output from weaker models that drift from the [Name|expression] format.
describe("ScriptParser — repairs off-format output", () => {
  it("reads a tag without brackets", () => {
    const { ctx } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("BB|smirk: Hey there, SENPAI~")).toEqual([
      { type: "dialogue", characterId: "bb", name: "BB", expression: "smirk", text: "Hey there, SENPAI~" },
    ]);
  });

  it("reads Name: and Name (expression): labels for known characters only", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("Oberon (smile): Good evening.")[0]).toMatchObject({ characterId: "oberon", expression: "smile", text: "Good evening." });
    expect(parser.parseLine("**BB**: Hi.")[0]).toMatchObject({ characterId: "bb", text: "Hi." });
    expect(parser.parseLine("Listen: this is just speech.")[0]).toMatchObject({ characterId: "bb", text: "Listen: this is just speech." });
  });

  it("treats {narration}, [narration] and Narrator: as narration", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("{narration} The device floats.")).toEqual([{ type: "narration", text: "The device floats." }]);
    expect(parser.parseLine("[Narration] Rain.")).toEqual([{ type: "narration", text: "Rain." }]);
    expect(parser.parseLine("Narrator: Silence.")).toEqual([{ type: "narration", text: "Silence." }]);
  });

  it("splits *actions* out of a dialogue line and keeps the speaker", () => {
    const { ctx } = makeCtx();
    const lines = new ScriptParser(ctx).parseLine(
      "*BB chuckles.* [BB|smirk] Trapped you? More like a gift. *She stops in front of you.* Isn't this better?",
    );
    expect(lines).toEqual([
      { type: "narration", text: "BB chuckles." },
      { type: "dialogue", characterId: "bb", name: "BB", expression: "smirk", text: "Trapped you? More like a gift." },
      { type: "narration", text: "She stops in front of you." },
      { type: "dialogue", characterId: "bb", name: "BB", expression: "", text: "Isn't this better?" },
    ]);
  });

  it("splits two tags written on one line", () => {
    const { ctx } = makeCtx();
    const lines = new ScriptParser(ctx).parseLine("[BB|smirk] Hi. [Oberon|smile] Hello.");
    expect(lines.map((l) => (l.type === "dialogue" ? l.name : l.type))).toEqual(["BB", "Oberon"]);
  });

  it("turns prose with quotes into narration and dialogue", () => {
    const { ctx } = makeCtx();
    const lines = new ScriptParser(ctx).parseLine('Oberon leans on the rail. "Can\'t sleep, Master?" He smiles.');
    expect(lines).toEqual([
      { type: "narration", text: "Oberon leans on the rail." },
      { type: "dialogue", characterId: "oberon", name: "Oberon", expression: "", text: "Can't sleep, Master?" },
      { type: "narration", text: "He smiles." },
    ]);
  });

  it("strips quotes around tagged dialogue and a stray closing bracket in narration", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine('[BB|smirk] "Fufu."')[0]).toMatchObject({ text: "Fufu." });
    expect(parser.parseLine("(narration) BB stands there, eyes glinting.)")).toEqual([
      { type: "narration", text: "BB stands there, eyes glinting." },
    ]);
  });

  it("drops a user label and the user's words after it", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("Ritsuka:")).toEqual([]);
    expect(parser.parseLine('(narration) "What are you talking about? I')).toEqual([]);
    expect(parser.parseLine("I don't get it.")).toEqual([]);
    expect(parser.parseLine("[BB|smirk] Anyway!")).toHaveLength(1);
  });

  it("ignores enter for the user and broken commands", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("{enter:Ritsuka:center}")).toEqual([]);
    expect(parser.parseLine("{enter:Ritsuka:cente")).toEqual([]);
  });

  it("maps near-miss expressions to one the sheet has", () => {
    const { ctx, warnings } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("[BB|smirking] Hm.")[0]).toMatchObject({ expression: "smirk" });
    expect(parser.parseLine("[BB|furious] Hm.")[0]).toMatchObject({ expression: "angry" });
    expect(parser.parseLine("[Oberon|happy] Hm.")[0]).toMatchObject({ expression: "smile" });
    expect(warnings.every((w) => w.includes("mapped to"))).toBe(true);
  });

  it("matches a longer name that contains a known one", () => {
    const { ctx } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("[Oberon Vortigern|smile] Hm.")[0]).toMatchObject({ characterId: "oberon" });
  });

  it("strips markdown noise", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("```")).toEqual([]);
    expect(parser.parseLine("- [BB|smirk] Hi.")[0]).toMatchObject({ characterId: "bb", text: "Hi." });
  });
});

describe("toScript", () => {
  it("writes repaired lines back in the canonical format", () => {
    const { ctx } = makeCtx();
    const lines = new ScriptParser(ctx).parseText(
      "{enter:Oberon:left}\n*BB grins.* BB|smirk: Hi *waves* there\n{narration} Quiet.",
    );
    expect(toScript(lines, ctx.characters)).toBe(
      [
        "{enter:Oberon:left}",
        "(narration) BB grins.",
        "[BB|smirk] Hi",
        "(narration) waves",
        "[BB|smirk] there",
        "(narration) Quiet.",
      ].join("\n"),
    );
  });
});

describe("ScriptParser — strict about misspelled tags", () => {
  it("reads misspelled narration tags as narration", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    for (const line of ["(narartion) Rain.", "[Naration] Rain.", "{narrtion} Rain.", "(Narrative) Rain.", "Narator: Rain.", "(description) Rain.", "<narration> Rain."]) {
      expect(parser.parseLine(line), line).toEqual([{ type: "narration", text: "Rain." }]);
    }
  });

  it("reads a narration tag in the middle of a dialogue line", () => {
    const { ctx } = makeCtx();
    const lines = new ScriptParser(ctx).parseLine("[BB|smirk] Hello, Senpai. (narration) She twirls her pointer.");
    expect(lines).toEqual([
      { type: "dialogue", characterId: "bb", name: "BB", expression: "smirk", text: "Hello, Senpai." },
      { type: "narration", text: "She twirls her pointer." },
    ]);
  });

  it("strips a (dialogue) tag and reads what follows", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("(dialogue) Oberon: Evening.")[0]).toMatchObject({ characterId: "oberon", text: "Evening." });
    expect(parser.parseLine("[Dialog] [BB|smirk] Hi.")[0]).toMatchObject({ characterId: "bb", expression: "smirk", text: "Hi." });
  });

  it("matches misspelled names, expressions and commands", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("[Obreon|smiel] Hm.")[0]).toMatchObject({ characterId: "oberon", name: "Oberon", expression: "smile" });
    expect(parser.parseLine("{secne:moon_cel}")).toEqual([{ type: "scene", backgroundKey: "moon_cell" }]);
    expect(parser.parseLine("{entr:Oberon:left}")).toEqual([{ type: "enter", characterId: "oberon", position: "left" }]);
    expect(parser.parseLine("{efect:shake}")).toEqual([{ type: "effect", effect: "shake" }]);
  });

  it("does not guess short names", () => {
    const { ctx } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("[BC|smirk] Hi.")[0]).toMatchObject({ characterId: null, name: "BC" });
  });

  it("drops a misspelled user name, meta lines and out-of-character notes", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("[Ritsuak|neutral] Fine.")).toEqual([]);
    expect(parser.parseLine("[BB|smirk] Anyway.")).toHaveLength(1);
    expect(parser.parseLine("(OOC: I'll keep replies short.)")).toEqual([]);
    expect(parser.parseLine("Location: Chaldea, night")).toEqual([]);
    expect(parser.parseLine("Note: this is fiction.")).toEqual([]);
  });

  it("never lets format tokens reach the text", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("[BB|smirk] BB: Hello {music:happy} there *")[0]).toMatchObject({ text: "Hello there" });
    expect(parser.parseLine("[BB|smirk] [smirk] Hi.")[0]).toMatchObject({ text: "Hi." });
    expect(parser.parseLine("[BB|smirk, happy] Hi.")[0]).toMatchObject({ expression: "smirk" });
  });
});
