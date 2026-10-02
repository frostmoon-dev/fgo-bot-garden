import { describe, expect, it } from "vitest";
import { EFFECTS } from "../types";
import { ScriptParser } from "../scriptParser";
import { makeCtx } from "./fixtures";

const parse = (line: string) => new ScriptParser(makeCtx().ctx).parseLine(line);

describe("screen effects", () => {
  it("reads every effect by name", () => {
    for (const effect of EFFECTS) expect(parse(`{effect:${effect}}`)).toEqual([{ type: "effect", effect }]);
  });

  it("reads the other words models use", () => {
    expect(parse("{effect:damage}")).toEqual([{ type: "effect", effect: "hit" }]);
    expect(parse("{effect:blur}")).toEqual([{ type: "effect", effect: "dizzy" }]);
    expect(parse("{effect:flashback}")).toEqual([{ type: "effect", effect: "dream" }]);
    expect(parse("{effect:close-up}")).toEqual([{ type: "effect", effect: "zoom" }]);
    expect(parse("{effect:Static}")).toEqual([{ type: "effect", effect: "glitch" }]);
  });

  it("still catches a misspelling", () => {
    expect(parse("{effect:glich}")).toEqual([{ type: "effect", effect: "glitch" }]);
  });

  it("drops an effect it doesn't know, without showing the braces", () => {
    const { ctx, warnings } = makeCtx();
    expect(new ScriptParser(ctx).parseLine("{effect:confetti}")).toEqual([]);
    expect(warnings[0]).toMatch(/Unknown effect/);
  });
});
