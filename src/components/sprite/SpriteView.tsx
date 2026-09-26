"use client";

import { cellOrigin, displaySheetUrl, type SheetGrid } from "./sheet";
import { useFadeLayers } from "./useFadeLayers";

interface Props {
  grid: SheetGrid;
  sheetUrl: string;
  cell: number;
  className?: string;
  faceOpacity?: number;
  fade?: boolean;
}

// The face cell's outer pixels match the body under it, so a few are left off: when the browser scales the
// sheet, the cells around this one bleed into its edge and would draw a faint box around the face.
const INSET = 4;

function Face({ grid, sheetUrl, cell, opacity, className }: { grid: SheetGrid; sheetUrl: string; cell: number; opacity?: number; className?: string }) {
  const o = cellOrigin(grid, cell);
  const size = grid.cellSize - 2 * INSET;
  return (
    <svg
      x={grid.faceX + INSET}
      y={grid.faceY + INSET}
      width={size}
      height={size}
      viewBox={`${o.x + INSET} ${o.y + INSET} ${size} ${size}`}
      opacity={opacity}
      className={className}
      style={{ ["--fade" as string]: `${FACE_FADE}ms` }}
    >
      <image href={displaySheetUrl(sheetUrl, grid)} width={grid.sheetWidth} height={grid.sheetHeight} />
    </svg>
  );
}

// Draws the body part of an FGO sheet with one face cell on top. The SVG viewBox does the cropping.
// A new face fades in over the old one, which stays fully drawn underneath until the fade is done
// (so the body's own face never shows through halfway). Back to the body's face, the old one fades out.
const FACE_FADE = 180;

export function SpriteView({ grid, sheetUrl, cell, className = "", faceOpacity, fade = true }: Props) {
  const faces = useFadeLayers(cell >= 0 ? cell : null, cell >= 0 ? String(cell) : null, FACE_FADE + 80);
  const hasCurrent = faces.some((f) => !f.leaving);
  return (
    <svg
      viewBox={`0 0 ${grid.sheetWidth} ${grid.bodyHeight}`}
      preserveAspectRatio="xMidYMax meet"
      className={className}
      role="img"
    >
      <image href={displaySheetUrl(sheetUrl, grid)} width={grid.sheetWidth} height={grid.sheetHeight} />
      {fade
        ? faces.map((f) => (
            <Face
              key={f.key}
              grid={grid}
              sheetUrl={sheetUrl}
              cell={f.value}
              opacity={faceOpacity}
              className={f.leaving ? (hasCurrent ? undefined : "fade-out") : "fade-in"}
            />
          ))
        : cell >= 0 && <Face grid={grid} sheetUrl={sheetUrl} cell={cell} opacity={faceOpacity} />}
    </svg>
  );
}

// Just one face cell, for thumbnails and pickers.
export function FaceThumb({ grid, sheetUrl, cell, className = "" }: { grid: SheetGrid; sheetUrl: string; cell: number; className?: string }) {
  if (cell < 0) {
    // Show the body's own face region.
    return (
      <svg viewBox={`${grid.faceX} ${grid.faceY} ${grid.cellSize} ${grid.cellSize}`} className={className}>
        <image href={displaySheetUrl(sheetUrl, grid)} width={grid.sheetWidth} height={grid.sheetHeight} />
      </svg>
    );
  }
  const o = cellOrigin(grid, cell);
  return (
    <svg viewBox={`${o.x} ${o.y} ${grid.cellSize} ${grid.cellSize}`} className={className}>
      <image href={displaySheetUrl(sheetUrl, grid)} width={grid.sheetWidth} height={grid.sheetHeight} />
    </svg>
  );
}
