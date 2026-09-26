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

function Face({ grid, sheetUrl, cell, opacity, className }: { grid: SheetGrid; sheetUrl: string; cell: number; opacity?: number; className?: string }) {
  const o = cellOrigin(grid, cell);
  return (
    <svg
      x={grid.faceX}
      y={grid.faceY}
      width={grid.cellSize}
      height={grid.cellSize}
      viewBox={`${o.x} ${o.y} ${grid.cellSize} ${grid.cellSize}`}
      opacity={opacity}
      className={className}
    >
      <image href={displaySheetUrl(sheetUrl, grid)} width={grid.sheetWidth} height={grid.sheetHeight} />
    </svg>
  );
}

// Draws the body part of an FGO sheet with one face cell on top. The SVG viewBox does the cropping.
export function SpriteView({ grid, sheetUrl, cell, className = "", faceOpacity, fade = true }: Props) {
  const faces = useFadeLayers(cell >= 0 ? cell : null, cell >= 0 ? String(cell) : null, 220);
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
              className={f.leaving ? undefined : "fade-in"}
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
