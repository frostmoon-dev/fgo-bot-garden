import { describe, expect, it } from "vitest";
import { buildPrompt } from "../prompt/builder";
import { formChangeLine, formChangeNote, pendingFormChanges, readFormChange } from "../story/formChange";

describe("form changes", () => {
  it("round-trips the story line", () => {
    const line = formChangeLine("BB", "Swimsuit");
    expect(line).toBe("(narration) BB changes form: Swimsuit.");
    expect(readFormChange(line)).toEqual({ name: "BB", form: "Swimsuit" });
    expect(readFormChange("(narration) BB smiles.")).toBeNull();
  });

  it("finds changes the characters haven't reacted to yet", () => {
    const history = [
      { role: "assistant", content: "[BB|smile] Hi." },
      { role: "user", content: "Hello." },
      { role: "assistant", content: formChangeLine("BB", "Ascension 1") },
      { role: "assistant", content: formChangeLine("BB", "Swimsuit") },
      { role: "user", content: "Whoa." },
    ];
    expect(pendingFormChanges(history)).toEqual([{ name: "BB", form: "Swimsuit" }]);
    expect(pendingFormChanges([...history, { role: "assistant", content: "[BB|smug] Like it?" }])).toEqual([]);
  });

  it("tells the model the current form and what just happened", () => {
    const prompt = buildPrompt({
      mode: "narrative",
      mainCharacterId: "bb",
      cast: [
        {
          id: "bb", name: "BB", aliases: [], description: "", personality: "", speechStyle: "", lore: "", relationship: "",
          scenario: "", exampleDialogues: "", expressions: [{ key: "neutral", label: "", description: "" }],
          form: "Swimsuit", otherForms: ["Ascension 1"],
        },
      ],
      backgrounds: [],
      persona: { name: "Ritsuka", description: "", addressAs: "" },
      lore: [],
      summary: "",
      events: [formChangeNote({ name: "BB", form: "Swimsuit" })],
      history: [{ role: "user", content: "Hi" }],
      continueScene: false,
    });
    const text = prompt.messages.map((m) => m.content).join("\n");
    expect(text).toContain("Current form: Swimsuit (other forms: Ascension 1)");
    expect(text).toContain("# JUST HAPPENED\n- BB has just changed form: Swimsuit.");
  });
});
