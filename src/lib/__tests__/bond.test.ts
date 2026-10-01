import { describe, expect, it } from "vitest";
import { bondLevel, MAX_BOND_LEVEL, pointsForLevel } from "../bond";

describe("pointsForLevel", () => {
  it("gives the first point of each level, so setting a level lands exactly on it", () => {
    for (let level = 1; level <= MAX_BOND_LEVEL; level++) expect(bondLevel(pointsForLevel(level))).toBe(level);
    expect(pointsForLevel(1)).toBe(0);
  });

  it("keeps out-of-range levels inside 1 to the max", () => {
    expect(bondLevel(pointsForLevel(0))).toBe(1);
    expect(bondLevel(pointsForLevel(99))).toBe(MAX_BOND_LEVEL);
  });
});
