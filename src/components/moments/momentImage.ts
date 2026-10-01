import { cellOrigin } from "@/components/sprite/sheet";
import type { MomentInput } from "@/lib/moment";

const W = 1600;
const H = 900;
// As on screen: the face cell's outer pixels are left off, so no faint box shows around the face.
const INSET = 4;

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("A picture in this moment could not be loaded."));
    img.src = url;
  });
}

// "10 27 66" (a palette token) → "rgb(10 27 66 / a)"; anything else is used as is.
function token(name: string, alpha = 1): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^\d+ \d+ \d+$/.test(value) ? `rgb(${value} / ${alpha})` : value || "#1b2433";
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Draws a moment card as a 1600×900 PNG. Pictures from hosts that don't allow it can't be drawn into an
// image (the browser blocks it), so that case says so instead of saving a blank card.
export async function momentPng(moment: MomentInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = token("--bg");
  ctx.fillRect(0, 0, W, H);

  if (moment.imageUrl) {
    const bg = await load(moment.imageUrl);
    const scale = Math.max(W / bg.width, H / bg.height);
    ctx.drawImage(bg, (W - bg.width * scale) / 2, (H - bg.height * scale) / 2, bg.width * scale, bg.height * scale);
  }

  if (moment.sprite) {
    const { grid, sheetUrl, cell } = moment.sprite;
    const sheet = await load(sheetUrl);
    // The sheet may be stored smaller or larger than its grid says.
    const k = sheet.width / grid.sheetWidth;
    const dh = H * 0.96;
    const scale = dh / grid.bodyHeight;
    const dw = grid.sheetWidth * scale;
    const x = (W - dw) / 2;
    const y = H - dh;
    ctx.drawImage(sheet, 0, 0, grid.sheetWidth * k, grid.bodyHeight * k, x, y, dw, dh);
    if (cell >= 0) {
      const o = cellOrigin(grid, cell);
      const size = grid.cellSize - 2 * INSET;
      ctx.drawImage(
        sheet,
        (o.x + INSET) * k,
        (o.y + INSET) * k,
        size * k,
        size * k,
        x + (grid.faceX + INSET) * scale,
        y + (grid.faceY + INSET) * scale,
        size * scale,
        size * scale,
      );
    }
  }

  const font = getComputedStyle(document.body).fontFamily;
  const boxX = 48;
  const boxW = W - 96;
  ctx.font = `${moment.narration ? "italic " : ""}34px ${font}`;
  const lines = wrap(ctx, moment.text, boxW - 96).slice(0, 4);
  const boxH = 56 + lines.length * 52 + (moment.speaker ? 52 : 0);
  const boxY = H - boxH - 36;
  ctx.fillStyle = token("--navy-900", 0.88);
  ctx.strokeStyle = token("--edge", 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 18);
  ctx.fill();
  ctx.stroke();
  let ty = boxY + 54;
  if (moment.speaker) {
    ctx.font = `600 34px ${font}`;
    ctx.fillStyle = token("--on-navy");
    ctx.fillText(moment.speaker, boxX + 48, ty);
    ty += 52;
  }
  ctx.font = `${moment.narration ? "italic " : ""}34px ${font}`;
  ctx.fillStyle = token("--on-navy");
  for (const line of lines) {
    ctx.fillText(line, boxX + 48, ty);
    ty += 52;
  }

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The image could not be made."))), "image/png");
    } catch {
      reject(new Error("This picture's host doesn't allow saving it into an image. The card itself is kept."));
    }
  });
}
