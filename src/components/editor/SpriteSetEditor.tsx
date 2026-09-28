"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { deleteSpriteSet, updateSpriteSet } from "@/app/actions/characters";
import { SpriteView } from "@/components/sprite/SpriteView";
import { resolveCell, type SheetGrid } from "@/components/sprite/sheet";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextInput } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import type { ExpressionView, SpriteSetView } from "@/lib/types";
import { FaceAssigner } from "./FaceAssigner";
import { OffsetTool } from "./OffsetTool";
import { autoAlign, detectFaceCount, loadImage } from "./sheetTools";
import { askConfirm } from "@/components/ui/dialogs";

const GRID_FIELDS: { key: keyof SheetGrid; title: string }[] = [
  { key: "bodyHeight", title: "Body height" },
  { key: "cellSize", title: "Face cell size" },
  { key: "columns", title: "Columns" },
  { key: "faceCount", title: "Face count" },
];

export function SpriteSetEditor({ set, expressions }: { set: SpriteSetView; expressions: ExpressionView[] }) {
  const [name, setName] = useState(set.name);
  const [sheetUrl, setSheetUrl] = useState(set.sheetUrl);
  const [grid, setGrid] = useState<SheetGrid>(() => ({
    sheetWidth: set.sheetWidth,
    sheetHeight: set.sheetHeight,
    bodyHeight: set.bodyHeight,
    cellSize: set.cellSize,
    columns: set.columns,
    faceCount: set.faceCount,
    faceX: set.faceX,
    faceY: set.faceY,
  }));
  const [faces, setFaces] = useState<Record<string, number>>(() => ({ ...set.faces }));
  const [selected, setSelected] = useState("neutral");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const { pending, error, setError, run } = useAsync();

  const change = (patch: Partial<SheetGrid>) => {
    setDirty(true);
    setGrid((g) => ({ ...g, ...patch }));
  };

  async function withImage(fn: (img: HTMLImageElement) => void) {
    setBusy(true);
    setError(null);
    try {
      fn(await loadImage(sheetUrl));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the sheet");
    } finally {
      setBusy(false);
    }
  }

  const redetect = () =>
    withImage((img) => {
      const next = { ...grid, sheetWidth: img.naturalWidth, sheetHeight: img.naturalHeight };
      change({ sheetWidth: next.sheetWidth, sheetHeight: next.sheetHeight, faceCount: detectFaceCount(img, next) });
    });

  const align = () =>
    withImage((img) => {
      const p = autoAlign(img, grid, Math.max(0, faces.neutral ?? 0));
      change({ faceX: p.x, faceY: p.y });
    });

  function save() {
    run(async () => {
      unwrap(await updateSpriteSet(set.id, { name, sheetUrl, ...grid }, faces));
      setDirty(false);
    });
  }

  const previewCell = resolveCell({ faces, faceCount: grid.faceCount }, selected);

  return (
    <div className="space-y-12">
      <div className="grid gap-6 sm:grid-cols-2">
        <Label title="Ascension name">
          <TextInput value={name} onChange={(e) => { setDirty(true); setName(e.target.value); }} />
        </Label>
        <Label title="Sheet URL or path">
          <TextInput value={sheetUrl} onChange={(e) => { setDirty(true); setSheetUrl(e.target.value); }} />
        </Label>
      </div>

      <details className="card p-4">
        <summary className="cursor-pointer text-sm">
          Sheet grid ({grid.sheetWidth}×{grid.sheetHeight}, {grid.faceCount} faces)
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GRID_FIELDS.map((f) => (
            <Label key={f.key} title={f.title}>
              <TextInput
                type="number"
                min={f.key === "faceCount" ? 0 : 1}
                value={grid[f.key]}
                onChange={(e) => change({ [f.key]: Math.max(0, Number(e.target.value) || 0) })}
              />
            </Label>
          ))}
        </div>
        <Button className="mt-3" onClick={redetect} disabled={busy}>
          Re-detect size and faces
        </Button>
      </details>

      <section className="space-y-4">
        <h2 className="font-title text-2xl font-semibold">Face position</h2>
        <p className="text-sm text-muted">Drag the dashed face until it covers the face on the body. One offset works for every expression.</p>
        <OffsetTool
          grid={grid}
          sheetUrl={sheetUrl}
          cell={faces[selected] ?? faces.neutral ?? 0}
          onChange={change}
          onAutoAlign={align}
          aligning={busy}
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-title text-2xl font-semibold">Faces for each expression</h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <FaceAssigner
            grid={grid}
            sheetUrl={sheetUrl}
            expressions={expressions}
            faces={faces}
            selected={selected}
            onSelect={setSelected}
            onAssign={(key, cell) => {
              setDirty(true);
              setFaces((f) => {
                const next = { ...f };
                if (cell === null) delete next[key];
                else next[key] = cell;
                return next;
              });
            }}
          />
          <div className="space-y-1">
            <p className="text-sm text-muted">
              Live preview: <span className="font-mono text-accent">{selected}</span>
            </p>
            <SpriteView grid={grid} sheetUrl={sheetUrl} cell={previewCell} className="card w-full" />
          </div>
        </div>
      </section>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 md:bottom-0 flex flex-wrap items-center gap-4 border-t border-line bg-canvas py-4">
        <Button variant="primary" onClick={save} disabled={pending || !dirty}>
          {pending ? "Saving…" : dirty ? "Save sheet" : "Saved"}
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={async () => {
            const ok = await askConfirm({
              title: `Delete "${set.name}"?`,
              body: `This ascension, its sprite sheet and its definition will be deleted. This cannot be undone.`,
              confirmLabel: "Delete ascension",
              danger: true,
            });
            if (ok) run(async () => unwrap(await deleteSpriteSet(set.id)));
          }}
        >
          Delete ascension
        </Button>
        <ErrorText error={error} />
      </div>
    </div>
  );
}
