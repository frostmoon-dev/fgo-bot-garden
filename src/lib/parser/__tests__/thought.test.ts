import { describe, expect, it } from "vitest";
import { BeatBuilder } from "@/lib/stage/beats";
import { emptyStage } from "@/lib/stage/stage";
import { buildPrompt } from "@/lib/prompt/builder";
import { ScriptParser, toScript } from "../scriptParser";
import { canonicalize } from "../transcript";
import { makeCtx } from "./fixtures";

describe("inner thoughts", () => {
  it("reads (thought:Name) lines as a private thought of that character", () => {
    const { ctx } = makeCtx();
    expect(new ScriptParser(ctx).parseText("(thought:Oberon) How tiresome. She's looking again.")).toEqual([
      { type: "thought", characterId: "oberon", name: "Oberon", text: "How tiresome. She's looking again." },
    ]);
    expect(new ScriptParser(ctx).parseText("[Thoughts|Vortigern]: Annoying.")[0]).toMatchObject({ type: "thought", characterId: "oberon" });
  });

  it("never writes the user's thoughts", () => {
    const { ctx, warnings } = makeCtx();
    expect(new ScriptParser(ctx).parseText("(thought:Ritsuka) He's so pretty.")).toEqual([]);
    expect(warnings.join()).toMatch(/thought written for the user/);
  });

  it("goes back into the history in the same format", () => {
    const { ctx } = makeCtx();
    const text = "[Oberon|smile] Good morning.\n(thought:Oberon) Not that it is.";
    expect(canonicalize(text, ctx)).toBe(text);
    expect(toScript(new ScriptParser(ctx).parseText("(thought:Oberon) Hm."), ctx.characters)).toBe("(thought:Oberon) Hm.");
  });

  it("shows as a quiet narration beat that names the thinker and moves nobody", () => {
    const { ctx } = makeCtx();
    const builder = new BeatBuilder("m1", ctx, { mode: "narrative", mainCharacterId: "bb" }, emptyStage(null), { user: "Ritsuka", char: "BB" });
    const [beat] = builder.pushText("(thought:Oberon) Leave already.");
    expect(beat).toMatchObject({ kind: "narration", thinker: { id: "oberon", name: "Oberon" }, text: "Leave already." });
    expect(Object.values(beat.stage.slots).every((s) => s === null)).toBe(true);
  });

  it("is only explained to the model when the setting is on", () => {
    const base = {
      mode: "narrative" as const,
      mainCharacterId: "bb",
      cast: [],
      backgrounds: [],
      persona: { name: "Ritsuka", description: "", addressAs: "" },
      lore: [],
      summary: "",
      history: [{ role: "user" as const, content: "Hi" }],
      continueScene: false,
    };
    expect(buildPrompt(base).messages[0].content).not.toContain("INNER THOUGHTS");
    expect(buildPrompt({ ...base, options: { innerThoughts: true } }).messages[0].content).toContain("(thought:Name)");
  });
});
