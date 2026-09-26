import { getImageProps } from "next/image";
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

// Sheets are 1–3 MB PNGs. For display they go through the Next.js image optimizer, which serves
// a cached WebP about a fifth of the size. Pixel tools (auto-align, face count) use the original.
const cache = new Map<string, string>();
export function displaySheetUrl(url: string, grid: Pick<SheetGrid, "sheetWidth" | "sheetHeight">): string {
  const optimizable = /^\/(?:assets|uploads)\//.test(url) || /^https:\/\/[^/]+\/storage\/v1\/object\/public\//.test(url);
  if (!optimizable) return url;
  let src = cache.get(url);
  if (!src) {
    try {
      src = getImageProps({ src: url, alt: "", width: grid.sheetWidth, height: grid.sheetHeight, quality: 90 }).props.src;
    } catch {
      src = url;
    }
    cache.set(url, src);
  }
  return src;
}

export function spriteAspect(grid: SheetGrid): number {
  return grid.sheetWidth / grid.bodyHeight;
}
