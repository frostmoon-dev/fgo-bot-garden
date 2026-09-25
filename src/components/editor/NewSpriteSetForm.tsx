"use client";

import { unwrap } from "@/lib/actionResult";
import { useState } from "react";
import { createSpriteSet } from "@/app/actions/characters";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/ErrorText";
import { Label, TextInput } from "@/components/ui/Field";
import { useAsync } from "@/components/ui/useAsync";
import { autoAlign, defaultGrid, detectFaceCount, loadImage, uploadImage } from "./sheetTools";

export function NewSpriteSetForm({ characterId, onCreated }: { characterId: string; onCreated: (id: string) => void }) {
  const [name, setName] = useState("Ascension 1");
  const [file, setFile] = useState<File | null>(null);
  const [path, setPath] = useState("");
  const [status, setStatus] = useState("");
  const { pending, error, run } = useAsync();

  function create() {
    run(async () => {
      if (!file && !path.trim()) throw new Error("Choose a file or enter a path.");
      setStatus("Reading sheet…");
      const img = await loadImage(file ? URL.createObjectURL(file) : path.trim());
      const grid = defaultGrid(img.naturalWidth, img.naturalHeight);
      grid.faceCount = detectFaceCount(img, grid);
      if (grid.faceCount > 0) {
        setStatus("Lining up the face…");
        Object.assign(grid, (({ x, y }) => ({ faceX: x, faceY: y }))(autoAlign(img, grid)));
      }
      let sheetUrl = path.trim();
      if (file) {
        setStatus("Uploading…");
        sheetUrl = await uploadImage(file, "sprites");
      }
      setStatus("Saving…");
      const id = unwrap(await createSpriteSet(characterId, { name: name.trim() || "Sprites", sheetUrl, ...grid }));
      setStatus("");
      setFile(null);
      setPath("");
      onCreated(id);
    });
  }

  return (
    <div className="panel space-y-3 rounded-lg p-4">
      <h3 className="font-display text-gold">Add a sprite sheet</h3>
      <p className="text-xs text-ink-dim">
        FGO format: body on top (1024×768), 256×256 face cells below in 4 columns. The face count and face position are detected for you.
      </p>
      <Label title="Set name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Label>
      <Label title="Upload a sheet" hint="PNG or WebP with transparency.">
        <input
          type="file"
          accept="image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-night-3 file:px-3 file:py-1.5 file:text-ink"
        />
      </Label>
      <Label title="…or use a file from /public" hint="Example: /assets/sprites/bb/ascension1.webp">
        <TextInput value={path} onChange={(e) => setPath(e.target.value)} disabled={!!file} placeholder="/assets/sprites/…" />
      </Label>
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={create} disabled={pending}>
          {pending ? status || "Working…" : "Add sheet"}
        </Button>
        <ErrorText error={error} />
      </div>
    </div>
  );
}
