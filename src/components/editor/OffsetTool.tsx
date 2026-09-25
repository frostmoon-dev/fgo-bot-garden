"use client";

import { useRef, useState } from "react";
import { cellOrigin, type SheetGrid } from "@/components/sprite/sheet";
import { Button } from "@/components/ui/Button";

interface Props {
  grid: SheetGrid;
  sheetUrl: string;
  cell: number;
  onChange: (pos: { faceX: number; faceY: number }) => void;
  onAutoAlign: () => void;
  aligning: boolean;
}

// Drag the face cell over the body until it lines up. Values are in sheet pixels.
export function OffsetTool({ grid, sheetUrl, cell, onChange, onAutoAlign, aligning }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; faceX: number; faceY: number } | null>(null);
  const [ghost, setGhost] = useState(true);

  const toSheet = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: pt.x, y: pt.y };
  };

  const onDown = (e: React.PointerEvent<SVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toSheet(e);
    drag.current = { x: p.x, y: p.y, faceX: grid.faceX, faceY: grid.faceY };
  };
  const onMove = (e: React.PointerEvent<SVGElement>) => {
    if (!drag.current) return;
    const p = toSheet(e);
    onChange({
      faceX: Math.round(drag.current.faceX + p.x - drag.current.x),
      faceY: Math.round(drag.current.faceY + p.y - drag.current.y),
    });
  };
  const onUp = () => {
    drag.current = null;
  };
  const nudge = (dx: number, dy: number) => onChange({ faceX: grid.faceX + dx, faceY: grid.faceY + dy });

  const o = cellOrigin(grid, Math.max(0, cell));

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-line bg-[repeating-conic-gradient(var(--raised)_0_25%,var(--surface)_0_50%)] bg-[length:24px_24px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${grid.sheetWidth} ${grid.bodyHeight}`}
          className="block h-auto w-full touch-none"
        >
          <image href={sheetUrl} width={grid.sheetWidth} height={grid.sheetHeight} />
          <svg
            x={grid.faceX}
            y={grid.faceY}
            width={grid.cellSize}
            height={grid.cellSize}
            viewBox={`${o.x} ${o.y} ${grid.cellSize} ${grid.cellSize}`}
            opacity={ghost ? 0.6 : 1}
            className="cursor-move"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <image href={sheetUrl} width={grid.sheetWidth} height={grid.sheetHeight} />
            <rect x={o.x} y={o.y} width={grid.cellSize} height={grid.cellSize} fill="none" stroke="var(--accent)" strokeWidth={3} strokeDasharray="10 6" />
          </svg>
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="mr-2 tabular-nums text-muted">
          x {grid.faceX} · y {grid.faceY}
        </span>
        <Button onClick={() => nudge(-1, 0)} aria-label="Left">←</Button>
        <Button onClick={() => nudge(1, 0)} aria-label="Right">→</Button>
        <Button onClick={() => nudge(0, -1)} aria-label="Up">↑</Button>
        <Button onClick={() => nudge(0, 1)} aria-label="Down">↓</Button>
        <Button onClick={() => setGhost((g) => !g)}>{ghost ? "Solid face" : "See-through face"}</Button>
        <Button onClick={onAutoAlign} disabled={aligning || grid.faceCount === 0}>
          {aligning ? "Aligning…" : "Auto-align"}
        </Button>
      </div>
    </div>
  );
}
