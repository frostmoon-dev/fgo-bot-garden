"use client";

import { FaceThumb } from "@/components/sprite/SpriteView";
import type { SheetGrid } from "@/components/sprite/sheet";
import type { ExpressionView } from "@/lib/types";

interface Props {
  grid: SheetGrid;
  sheetUrl: string;
  expressions: ExpressionView[];
  faces: Record<string, number>;
  selected: string;
  onSelect: (key: string) => void;
  onAssign: (key: string, cell: number | null) => void;
}

// Pick an expression on the left, then click a face cell to assign it.
export function FaceAssigner({ grid, sheetUrl, expressions, faces, selected, onSelect, onAssign }: Props) {
  const cells = [-1, ...Array.from({ length: grid.faceCount }, (_, i) => i)];
  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <ul className="max-h-[28rem] space-y-1 overflow-y-auto pr-1">
        {expressions.map((e) => {
          const cell = faces[e.key];
          return (
            <li key={e.key}>
              <button
                type="button"
                onClick={() => onSelect(e.key)}
                className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left text-sm ${
                  selected === e.key ? "border-accent bg-accent-soft" : "border-transparent hover:bg-raised"
                }`}
              >
                {cell !== undefined ? (
                  <FaceThumb grid={grid} sheetUrl={sheetUrl} cell={cell} className="size-10 shrink-0 rounded bg-canvas" />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded bg-canvas text-xs text-muted">?</span>
                )}
                <span className="min-w-0">
                  <span className="block font-mono">{e.key}</span>
                  <span className="block truncate text-xs text-muted">
                    {cell === undefined ? (e.key === "neutral" ? "not set: uses body face" : "not set: uses neutral") : cell === -1 ? "body face" : `cell ${cell + 1}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="space-y-2">
        <p className="text-sm text-muted">
          Click a face for <span className="font-mono text-accent">{selected}</span>.
          {faces[selected] !== undefined && (
            <button type="button" className="ml-2 text-danger underline" onClick={() => onAssign(selected, null)}>
              clear
            </button>
          )}
        </p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6">
          {cells.map((cell) => (
            <button
              type="button"
              key={cell}
              onClick={() => onAssign(selected, cell)}
              className={`relative overflow-hidden rounded-lg border ${faces[selected] === cell ? "border-accent ring-2 ring-accent" : "border-line hover:border-muted"}`}
              title={cell === -1 ? "Face drawn on the body" : `Cell ${cell + 1}`}
            >
              <FaceThumb grid={grid} sheetUrl={sheetUrl} cell={cell} className="block aspect-square w-full bg-canvas" />
              <span className="absolute bottom-0 left-0 rounded-tr bg-canvas/85 px-1.5 text-xs">{cell === -1 ? "body" : cell + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
