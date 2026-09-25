"use client";

import { cellOrigin, type SheetGrid } from "@/components/sprite/sheet";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Needed to read pixels from Supabase Storage URLs.
    if (/^https?:/.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src}`));
    img.src = src;
  });
}

function pixels(img: HTMLImageElement, x: number, y: number, w: number, h: number, scale = 1): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Standard FGO sheet: 1024 wide, 768 px body, 256 px face cells in 4 columns. Scales for other widths.
export function defaultGrid(width: number, height: number): SheetGrid {
  const scale = width / 1024;
  const cellSize = Math.round(256 * scale);
  const bodyHeight = Math.min(height, Math.round(768 * scale));
  return {
    sheetWidth: width,
    sheetHeight: height,
    bodyHeight,
    cellSize,
    columns: Math.max(1, Math.floor(width / cellSize)),
    faceCount: 0,
    faceX: Math.round((width - cellSize) / 2),
    faceY: Math.round(bodyHeight * 0.2),
  };
}

// Counts face cells up to the last one that has visible pixels.
export function detectFaceCount(img: HTMLImageElement, grid: SheetGrid): number {
  const rows = Math.floor((grid.sheetHeight - grid.bodyHeight) / grid.cellSize);
  let last = -1;
  for (let i = 0; i < rows * grid.columns; i++) {
    const o = cellOrigin(grid, i);
    const data = pixels(img, o.x, o.y, grid.cellSize, grid.cellSize, 32 / grid.cellSize).data;
    let solid = 0;
    for (let p = 3; p < data.length; p += 4) if (data[p] > 16) solid++;
    if (solid > (data.length / 4) * 0.05) last = i;
  }
  return last + 1;
}

function grayAlpha(data: ImageData): { g: Float32Array; a: Uint8Array } {
  const n = data.width * data.height;
  const g = new Float32Array(n);
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const d = i * 4;
    g[i] = data.data[d] * 0.3 + data.data[d + 1] * 0.59 + data.data[d + 2] * 0.11;
    a[i] = data.data[d + 3];
  }
  return { g, a };
}

function score(body: ReturnType<typeof grayAlpha>, bw: number, face: ReturnType<typeof grayAlpha>, fw: number, fh: number, ox: number, oy: number, step: number) {
  let sum = 0;
  let count = 0;
  for (let y = 0; y < fh; y += step) {
    for (let x = 0; x < fw; x += step) {
      const fi = y * fw + x;
      if (face.a[fi] < 200) continue;
      const bi = (oy + y) * bw + (ox + x);
      sum += Math.abs(face.g[fi] - body.g[bi]) + (body.a[bi] < 200 ? 255 : 0);
      count++;
    }
  }
  return count ? sum / count : Infinity;
}

// Finds where face cell 0 lines up with the face drawn on the body (coarse search, then refine).
export function autoAlign(img: HTMLImageElement, grid: SheetGrid, cell = 0): { x: number; y: number } {
  const coarse = 0.25;
  const bodyC = pixels(img, 0, 0, grid.sheetWidth, grid.bodyHeight, coarse);
  const o = cellOrigin(grid, cell);
  const faceC = pixels(img, o.x, o.y, grid.cellSize, grid.cellSize, coarse);
  const b = grayAlpha(bodyC);
  const f = grayAlpha(faceC);
  let best = { x: grid.faceX, y: grid.faceY, s: Infinity };
  for (let y = 0; y + faceC.height <= bodyC.height; y++) {
    for (let x = 0; x + faceC.width <= bodyC.width; x++) {
      const s = score(b, bodyC.width, f, faceC.width, faceC.height, x, y, 2);
      if (s < best.s) best = { x: Math.round(x / coarse), y: Math.round(y / coarse), s };
    }
  }
  // Refine at full size around the coarse hit.
  const pad = 6;
  const rx = Math.max(0, best.x - pad);
  const ry = Math.max(0, best.y - pad);
  const rw = Math.min(grid.sheetWidth - rx, grid.cellSize + pad * 2);
  const rh = Math.min(grid.bodyHeight - ry, grid.cellSize + pad * 2);
  const bodyF = grayAlpha(pixels(img, rx, ry, rw, rh));
  const faceF = grayAlpha(pixels(img, o.x, o.y, grid.cellSize, grid.cellSize));
  let fine = { x: best.x, y: best.y, s: Infinity };
  for (let y = 0; y + grid.cellSize <= rh; y++) {
    for (let x = 0; x + grid.cellSize <= rw; x++) {
      const s = score(bodyF, rw, faceF, grid.cellSize, grid.cellSize, x, y, 3);
      if (s < fine.s) fine = { x: rx + x, y: ry + y, s };
    }
  }
  return { x: fine.x, y: fine.y };
}

// Vercel limits uploads to 4.5 MB. Re-encode big files as WebP (keeps transparency).
export async function shrinkForUpload(file: File, limit = 3.8 * 1024 * 1024): Promise<Blob> {
  if (file.size <= limit) return file;
  const img = await loadImage(URL.createObjectURL(file));
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  for (const quality of [0.95, 0.9, 0.8, 0.7]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    if (blob && blob.size <= limit) return blob;
  }
  throw new Error("Image is too large even after compression. Make it smaller first.");
}

export async function uploadImage(file: File, kind: "sprites" | "backgrounds"): Promise<string> {
  const blob = await shrinkForUpload(file);
  const form = new FormData();
  form.append("file", blob instanceof File ? blob : new File([blob], "upload.webp", { type: "image/webp" }));
  form.append("kind", kind);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? `Upload failed (${res.status})`);
  return json.url;
}
