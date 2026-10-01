import { describe, expect, it } from "vitest";
import { INTERLUDES, interludePrompt, parseInterlude } from "../interlude";

describe("interludes", () => {
  it("unlock at rising bond levels", () => {
    expect(INTERLUDES.map((i) => i.level)).toEqual([3, 5, 7]);
  });

  it("reads the title and the scene", () => {
    expect(parseInterlude("Title: **Cold Tea**\nScene: The canteen is empty.\n\nHe waits.")).toEqual({
      title: "Cold Tea",
      scene: "The canteen is empty.\n\nHe waits.",
    });
  });

  it("keeps a scene the model wrote without labels", () => {
    expect(parseInterlude("The canteen is empty.")).toEqual({ title: "", scene: "The canteen is empty." });
  });

  it("names the pair and keeps the relationship as defined", () => {
    const prompt = interludePrompt("Oberon", "Ritsuka", INTERLUDES[0].theme);
    expect(prompt).toContain("a side of Oberon others rarely see");
    expect(prompt).toContain("if they don't talk, they still don't");
    expect(prompt).not.toContain("{{");
  });
});
