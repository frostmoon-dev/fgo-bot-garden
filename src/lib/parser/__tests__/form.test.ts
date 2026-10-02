import { describe, expect, it } from "vitest";
import { buildBeats, initialStage } from "@/lib/stage";
import { latestForms } from "@/lib/story/storyForms";
import { ScriptParser, toScript } from "../scriptParser";
import type { ParserContext } from "../types";
import { makeCtx } from "./fixtures";

const FORMS = [
  { id: "fairy", name: "Fairy King" },
  { id: "cloak", name: "Traveler's Cloak" },
  { id: "vort", name: "Vortigern" },
];
const BB_FORMS = [
  { id: "bb1", name: "Ascension 1" },
  { id: "bb2", name: "Ascension 2" },
];

function withForms(overrides: Partial<ParserContext> = {}) {
  const made = makeCtx(overrides);
  made.ctx.characters = made.ctx.characters.map((c) => ({ ...c, forms: c.id === "oberon" ? FORMS : BB_FORMS }));
  return made;
}

describe("form changes", () => {
  it("reads {form:Name:Form}", () => {
    const { ctx, warnings } = withForms();
    expect(new ScriptParser(ctx).parseLine("{form:Oberon:Vortigern}")).toEqual([{ type: "form", characterId: "oberon", spriteSetId: "vort" }]);
    expect(warnings).toEqual([]);
  });

  it("matches forms loosely", () => {
    const { ctx } = withForms();
    const p = new ScriptParser(ctx);
    expect(p.parseLine("{form:Oberon:vortigern form}")).toMatchObject([{ spriteSetId: "vort" }]);
    expect(p.parseLine("{form:Oberon:Travelers Cloak}")).toMatchObject([{ spriteSetId: "cloak" }]);
    expect(p.parseLine("{form:BB:2}")).toMatchObject([{ spriteSetId: "bb2" }]);
    expect(p.parseLine("{form:Vortigern}")).toMatchObject([{ characterId: "oberon", spriteSetId: "vort" }]);
  });

  it("ignores a form the character doesn't have, without showing the braces", () => {
    const { ctx, warnings } = withForms();
    expect(new ScriptParser(ctx).parseLine("{form:Oberon:Dragon King}")).toEqual([]);
    expect(warnings[0]).toMatch(/no form "Dragon King"/);
  });

  it("works in dialogue mode", () => {
    const { ctx } = withForms({ mode: "dialogue" });
    expect(new ScriptParser(ctx).parseLine("{form:Oberon:Vortigern}")).toHaveLength(1);
  });

  it("reads the Menu's form change narration as a switch, and doesn't write it twice", () => {
    const { ctx } = withForms();
    const lines = new ScriptParser(ctx).parseLine("(narration) Oberon changes form: Vortigern.");
    expect(lines).toEqual([
      { type: "form", characterId: "oberon", spriteSetId: "vort", silent: true },
      { type: "narration", text: "Oberon changes form: Vortigern." },
    ]);
    expect(toScript(lines, ctx.characters)).toBe("(narration) Oberon changes form: Vortigern.");
    expect(toScript(new ScriptParser(ctx).parseLine("{form:Oberon:vortigern}"), ctx.characters)).toBe("{form:Oberon:Vortigern}");
  });

  it("switches the sprite from that line on", () => {
    const { ctx } = withForms();
    const { beats } = buildBeats(
      [{ id: "m1", role: "assistant", content: "[Oberon|smile] Before.\n{form:Oberon:Vortigern}\n[Oberon|neutral] After." }],
      ctx,
      { mode: "narrative", mainCharacterId: "bb" },
      initialStage(null, "bb"),
      { user: "Ritsuka", char: "BB" },
      "Ritsuka",
    );
    expect(beats.map((b) => b.stage.forms?.oberon)).toEqual([undefined, "vort"]);
  });

  it("shows the new form on the Menu's change line itself", () => {
    const { ctx } = withForms();
    const { beats } = buildBeats(
      [{ id: "m1", role: "assistant", content: "(narration) Oberon changes form: Traveler's Cloak." }],
      ctx,
      { mode: "narrative", mainCharacterId: "oberon" },
      initialStage(null, "oberon"),
      { user: "Ritsuka", char: "Oberon" },
      "Ritsuka",
    );
    expect(beats.map((b) => b.stage.forms?.oberon)).toEqual(["cloak"]);
  });

  it("finds the latest form in a story", () => {
    const { ctx } = withForms();
    const forms = latestForms(["{form:Oberon:Vortigern}", "[BB|smirk] Hm.", "(narration) Oberon changes form: Fairy King."], ctx.characters, "narrative");
    expect(forms.get("oberon")).toBe("fairy");
    expect(forms.has("bb")).toBe(false);
  });
});
