"use client";

import { useEffect, useState } from "react";
import { cellOrigin, type SheetGrid } from "@/components/sprite/sheet";

type FaceSheet = SheetGrid & { sheetUrl: string };

// Where the face is across the image (0–1). Kept near the middle, so a badly placed face cell can't push
// anyone off screen.
const clamp = (x: number) => Math.min(0.7, Math.max(0.3, x));

// First guess, before the pixels are read: the middle of the face cell.
export function cellCenter(set: FaceSheet): number {
  return set.faceCount > 0 ? clamp((set.faceX + set.cellSize / 2) / set.sheetWidth) : 0.5;
}

const cache = new Map<string, number | null>();
const keyOf = (s: FaceSheet) => [s.sheetUrl, s.faceX, s.cellSize, s.columns, s.bodyHeight, s.faceCount].join("|");

const SIZE = 48;

// The face is where the expressions differ: eyes, brows and mouth change between face cells, hair and
// ribbons don't. Face cells often aren't centred on the face (BB's ribbon fills the right of hers), so the
// cell's middle can be off by a tenth of the cell. Returns null when the sheet can't be read.
async function measure(set: FaceSheet): Promise<number | null> {
  const img = new Image();
  if (/^https?:/.test(set.sheetUrl)) img.crossOrigin = "anonymous";
  img.src = set.sheetUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const n = SIZE * SIZE;
  const sum = new Float64Array(n);
  const sumSq = new Float64Array(n);
  for (let i = 0; i < set.faceCount; i++) {
    const o = cellOrigin(set, i);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, o.x, o.y, set.cellSize, set.cellSize, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    for (let p = 0; p < n; p++) {
      const d = p * 4;
      const v = (data[d] * 0.3 + data[d + 1] * 0.59 + data[d + 2] * 0.11) * (data[d + 3] / 255);
      sum[p] += v;
      sumSq[p] += v * v;
    }
  }
  let weight = 0;
  let moment = 0;
  for (let p = 0; p < n; p++) {
    const mean = sum[p] / set.faceCount;
    const variance = sumSq[p] / set.faceCount - mean * mean;
    if (variance <= 0) continue;
    weight += variance;
    moment += variance * ((p % SIZE) + 0.5);
  }
  if (weight === 0) return null;
  const withinCell = moment / weight / SIZE;
  return clamp((set.faceX + withinCell * set.cellSize) / set.sheetWidth);
}

// The face's position across the image, refined from the pixels once the sheet has loaded.
export function useFaceCenter(set: FaceSheet): number {
  const key = keyOf(set);
  const [measured, setMeasured] = useState<{ key: string; x: number | null } | null>(() =>
    cache.has(key) ? { key, x: cache.get(key) ?? null } : null,
  );

  useEffect(() => {
    if (set.faceCount < 2 || cache.has(key)) return;
    let alive = true;
    measure(set)
      .catch(() => null)
      .then((x) => {
        cache.set(key, x);
        if (alive) setMeasured({ key, x });
      });
    return () => {
      alive = false;
    };
    // The key covers every field measure() reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const x = measured?.key === key ? measured.x : cache.get(key);
  return x ?? cellCenter(set);
}
