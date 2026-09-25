import type { SpriteSetView } from "@/lib/types";

export type SheetGrid = Pick<
  SpriteSetView,
  "sheetWidth" | "sheetHeight" | "bodyHeight" | "cellSize" | "columns" | "faceCount" | "faceX" | "faceY"
>;

export function cellOrigin(grid: SheetGrid, index: number): { x: number; y: number } {
  return {
    x: (index % grid.columns) * grid.cellSize,
    y: grid.bodyHeight + Math.floor(index / grid.columns) * grid.cellSize,
  };
}

// Face cell for an expression, falling back to neutral, then to the body's own face (-1).
export function resolveCell(set: Pick<SpriteSetView, "faces" | "faceCount">, expression: string): number {
  const cell = set.faces[expression] ?? set.faces.neutral ?? -1;
  return cell < set.faceCount ? cell : -1;
}

export function spriteAspect(grid: SheetGrid): number {
  return grid.sheetWidth / grid.bodyHeight;
}
