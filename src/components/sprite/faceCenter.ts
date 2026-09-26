"use client";

import { cellOrigin, displaySheetUrl, type SheetGrid } from "./sheet";

// Where the face sits inside a sheet's face cells, as fractions of the cell (0–1). Sheets frame their face
// cells differently: Morgan's includes her tall crown, so her eyes sit two thirds down, BB's sit near the
// top. Between expressions only the eyes, brows and mouth change, so the pixels that differ from cell to
// cell mark the face, and their centre is used to frame portraits the same way for everyone.
export interface FacePoint {
  x: number;
  y: number;
}

const SIZE = 64;
const MAX_CELLS = 8;
const cache = new Map<string, Promise<FacePoint | null>>();

function keyOf(url: string, grid: SheetGrid): string {
  return `face-center:v1:${url}:${grid.faceX}:${grid.faceY}:${grid.cellSize}:${grid.bodyHeight}:${grid.columns}:${grid.faceCount}`;
}

// Pure part, for tests: gray pixel rows (SIZE×SIZE each) of the face cells, the first one being the reference.
export function centreOfChange(cells: Float32Array[], size = SIZE): FacePoint | null {
  if (cells.length < 2) return null;
  const change = new Float32Array(size * size);
  for (const cell of cells.slice(1)) {
    for (let i = 0; i < change.length; i++) change[i] = Math.max(change[i], Math.abs(cell[i] - cells[0][i]));
  }
  // Only the strongest changes count: shading noise and compression speckle stay below this.
  const sorted = Float32Array.from(change).sort();
  const threshold = Math.max(24, sorted[Math.floor(sorted.length * 0.9)]);
  let sx = 0;
  let sy = 0;
  let total = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const w = change[y * size + x];
      if (w < threshold) continue;
      sx += w * x;
      sy += w * y;
      total += w;
    }
  }
  if (!total) return null;
  return { x: (sx / total + 0.5) / size, y: (sy / total + 0.5) / size };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

async function measure(url: string, grid: SheetGrid): Promise<FacePoint | null> {
  const count = Math.min(grid.faceCount, MAX_CELLS);
  if (count < 2) return null;
  // The same (optimized, same-origin) file the portraits draw, so the pixels can be read.
  const img = await loadImage(displaySheetUrl(url, grid));
  // The optimized file may be scaled from the original sheet.
  const k = img.naturalWidth / grid.sheetWidth;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const cells: Float32Array[] = [];
  for (let i = 0; i < count; i++) {
    const o = cellOrigin(grid, i);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, o.x * k, o.y * k, grid.cellSize * k, grid.cellSize * k, 0, 0, SIZE, SIZE);
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
    const gray = new Float32Array(SIZE * SIZE);
    for (let p = 0; p < gray.length; p++) gray[p] = data[p * 4] * 0.3 + data[p * 4 + 1] * 0.59 + data[p * 4 + 2] * 0.11;
    cells.push(gray);
  }
  return centreOfChange(cells);
}

// Measured once per sheet and remembered in this browser. Null when it can't be told (one face cell, or a
// sheet from another site that doesn't allow reading its pixels).
export function faceCenter(url: string, grid: SheetGrid): Promise<FacePoint | null> {
  const key = keyOf(url, grid);
  let found = cache.get(key);
  if (!found) {
    found = (async () => {
      try {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved) as FacePoint | null;
      } catch {
        // Storage can be blocked; measure instead.
      }
      const point = await measure(url, grid).catch(() => null);
      // Only a found face is remembered, so a sheet that failed to load is measured again next time.
      if (point) {
        try {
          localStorage.setItem(key, JSON.stringify(point));
        } catch {
          // Not remembered; it is measured again next time.
        }
      }
      return point;
    })();
    cache.set(key, found);
  }
  return found;
}
