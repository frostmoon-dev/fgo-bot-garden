import { describe, expect, it } from "vitest";
import { ScriptParser } from "../scriptParser";
import { makeCtx } from "./fixtures";

// Reasoning models sometimes write their plan into the reply. It must never reach the text box.
describe("ScriptParser — drops the model's planning", () => {
  it("drops planning and copied scene fields", () => {
    const { ctx, warnings } = makeCtx();
    const parser = new ScriptParser(ctx);
    const leaked = [
      "We need to continue the scene: current location is control room, present: Shiru, Ritsuka, technicians. Mood: quiet relief after Oberon's departure.",
      "Okay, so I need to write the reply in character as BB.",
      "The user wants BB to apologize.",
      "Let me keep the dialogue short and use tags.",
      "(We should respond with narration first.)",
    ];
    for (const line of leaked) expect(parser.parseLine(line)).toEqual([]);
    expect(warnings.filter((w) => w.startsWith("Dropped the model's planning"))).toHaveLength(leaked.length);
  });

  it("keeps story lines that merely sound similar", () => {
    const { ctx } = makeCtx();
    const parser = new ScriptParser(ctx);
    expect(parser.parseLine("[BB|smirk] We need to leave before the scene gets worse, Senpai.")[0]).toMatchObject({ characterId: "bb" });
    expect(parser.parseLine("We need to go. Now.")).not.toEqual([]);
    expect(parser.parseLine("Let me show you the scene of the crime.")).not.toEqual([]);
    expect(parser.parseLine("Let me show {{user}} around.")).not.toEqual([]);
    expect(parser.parseLine("(The present is fragile; the mood is heavy.)")).not.toEqual([]);
    expect(parser.parseLine("(The room falls quiet. The time is late.)")).toEqual([{ type: "narration", text: "The room falls quiet. The time is late." }]);
  });
});
