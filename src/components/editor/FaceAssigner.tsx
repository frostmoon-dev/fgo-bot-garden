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
                className={`flex w-full items-center gap-2 rounded-md border p-1.5 text-left text-sm ${
                  selected === e.key ? "border-gold bg-night-3" : "border-night-3 hover:border-gold-dim"
                }`}
              >
                {cell !== undefined ? (
                  <FaceThumb grid={grid} sheetUrl={sheetUrl} cell={cell} className="size-10 shrink-0 rounded bg-night" />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded bg-night text-xs text-ink-dim">?</span>
                )}
                <span className="min-w-0">
                  <span className="block font-mono">{e.key}</span>
                  <span className="block truncate text-xs text-ink-dim">
                    {cell === undefined ? (e.key === "neutral" ? "not set: uses body face" : "not set: uses neutral") : cell === -1 ? "body face" : `cell ${cell + 1}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="space-y-2">
        <p className="text-sm text-ink-dim">
          Click a face for <span className="font-mono text-gold">{selected}</span>.
          {faces[selected] !== undefined && (
            <button type="button" className="ml-2 text-danger underline" onClick={() => onAssign(selected, null)}>
              clear
            </button>
          )}
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {cells.map((cell) => (
            <button
              type="button"
              key={cell}
              onClick={() => onAssign(selected, cell)}
              className={`relative overflow-hidden rounded-md border ${faces[selected] === cell ? "border-gold ring-2 ring-gold" : "border-night-3 hover:border-gold-dim"}`}
              title={cell === -1 ? "Face drawn on the body" : `Cell ${cell + 1}`}
            >
              <FaceThumb grid={grid} sheetUrl={sheetUrl} cell={cell} className="block aspect-square w-full bg-night" />
              <span className="absolute bottom-0 left-0 bg-night/80 px-1 text-[10px]">{cell === -1 ? "body" : cell + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
