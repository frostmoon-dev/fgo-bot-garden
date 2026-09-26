import { describe, expect, it } from "vitest";
import { centreOfChange } from "@/components/sprite/faceCenter";

// A 64×64 cell of flat gray with a square "eye" whose shade changes between expressions.
function cell(shade: number, x0: number, y0: number, size = 64): Float32Array {
  const g = new Float32Array(size * size).fill(120);
  for (let y = y0; y < y0 + 6; y++) for (let x = x0; x < x0 + 6; x++) g[y * size + x] = shade;
  return g;
}

describe("centreOfChange", () => {
  it("finds where the expressions differ", () => {
    const p = centreOfChange([cell(40, 20, 40), cell(200, 20, 40), cell(90, 20, 40)]);
    expect(p!.x).toBeCloseTo(23 / 64, 2);
    expect(p!.y).toBeCloseTo(43 / 64, 2);
  });

  it("gives up with a single face cell or cells that don't differ", () => {
    expect(centreOfChange([cell(40, 20, 40)])).toBeNull();
    expect(centreOfChange([cell(40, 20, 40), cell(40, 20, 40)])).toBeNull();
  });
});
