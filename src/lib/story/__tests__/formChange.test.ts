import { describe, expect, it } from "vitest";
import { formChangeLine, formChangeNote, pendingFormChanges, readFormChange } from "../formChange";

describe("form changes", () => {
  it("reads back the line a switch writes", () => {
    expect(readFormChange(formChangeLine("Oberon", "Vortigern"))).toEqual({ name: "Oberon", form: "Vortigern" });
    expect(readFormChange("(narration) Oberon smiles.")).toBeNull();
  });

  it("keeps only the latest form when switched twice before a reply", () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: formChangeLine("Oberon", "Traveler's Cloak") },
      { role: "assistant", content: formChangeLine("Oberon", "Vortigern") },
    ];
    expect(pendingFormChanges(messages)).toEqual([{ name: "Oberon", form: "Vortigern" }]);
  });

  it("tells the model the character keeps their memories", () => {
    const note = formChangeNote({ name: "Oberon", form: "Vortigern" });
    expect(note).toContain("It is the same Oberon");
    expect(note).toContain("remember everything that happened before the change");
  });
});
