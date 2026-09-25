import { describe, expect, it } from "vitest";
import { matchLore } from "../matcher";

const entry = (id: string, keywords: string[], enabled = true) => ({ id, title: id, keywords, content: id, enabled });

describe("matchLore", () => {
  it("matches whole words, case-insensitively", () => {
    const entries = [entry("moon", ["Moon Cell"]), entry("art", ["art"])];
    expect(matchLore(entries, ["We are in the moon cell.", "Arthur waits."]).map((e) => e.id)).toEqual(["moon"]);
  });

  it("skips disabled entries", () => {
    expect(matchLore([entry("a", ["BB"], false)], ["BB is here"])).toEqual([]);
  });

  it("handles regex characters in keywords", () => {
    expect(matchLore([entry("q", ["BB?"])], ["Is that BB? yes"]).map((e) => e.id)).toEqual(["q"]);
  });

  it("ignores empty keywords", () => {
    expect(matchLore([entry("e", ["", "  "])], ["anything"])).toEqual([]);
  });
});
