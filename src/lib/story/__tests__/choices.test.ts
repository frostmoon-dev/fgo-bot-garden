import { describe, expect, it } from "vitest";
import { parseChoices } from "../choices";

describe("parseChoices", () => {
  it("ignores the model describing the task instead of doing it", () => {
    const leaked =
      "We need 3 lines starting with SAY: or DO:, showing different aspects of Shiru's personality - one bold, one kind/warm, one curious/playful. Each at most 20 words, first person, in character.";
    expect(parseChoices(leaked)).toEqual([]);
    expect(parseChoices(`${leaked}\nSAY: Castoria, breathe. He's teasing you.\nDO: Step between them with a smile.\nSAY: Oberon, what are you really here for?`)).toEqual([
      { kind: "say", text: "Castoria, breathe. He's teasing you." },
      { kind: "do", text: "Step between them with a smile." },
      { kind: "say", text: "Oberon, what are you really here for?" },
    ]);
  });

  it("still reads options written inside roleplay", () => {
    expect(parseChoices("*grins* SAY: Hey there. *DO: Leave the room.*")).toEqual([
      { kind: "say", text: "Hey there." },
      { kind: "do", text: "Leave the room." },
    ]);
    expect(parseChoices('1. SAY: "Or maybe we just ask her?"')).toEqual([{ kind: "say", text: "Or maybe we just ask her?" }]);
    expect(parseChoices("SAY: I love your personality, honestly.")).toHaveLength(1);
  });
});
