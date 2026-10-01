import { describe, expect, it } from "vitest";
import { titleCase } from "../scene";

describe("titleCase", () => {
  it("capitalises words and keeps small words lower case", () => {
    expect(titleCase("an empty meeting room in Chaldea, lit by candles")).toBe("An Empty Meeting Room in Chaldea, Lit by Candles");
    expect(titleCase("outside Shiru's room in Chaldea")).toBe("Outside Shiru's Room in Chaldea");
    expect(titleCase("late evening")).toBe("Late Evening");
  });

  it("keeps capitals the model wrote and lowers small words written in capitals", () => {
    expect(titleCase("BB's room On the Moon Cell")).toBe("BB's Room on the Moon Cell");
    expect(titleCase("the well-lit hall")).toBe("The Well-Lit Hall");
  });

  it("capitalises a small word at the start, at the end, and after a colon", () => {
    expect(titleCase("the place to go to")).toBe("The Place to Go To");
    expect(titleCase("Chaldea: the command room")).toBe("Chaldea: The Command Room");
  });
});
