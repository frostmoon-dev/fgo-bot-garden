import { isAuthed } from "@/lib/auth/server";
import { extensionFor, storeUpload, type UploadKind } from "@/lib/storage";

// Vercel rejects request bodies over 4.5 MB. The editor shrinks bigger files before upload.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Not signed in" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (kind !== "sprites" && kind !== "backgrounds" && kind !== "music") return Response.json({ error: "Bad kind" }, { status: 400 });
  // Pictures go to the picture folders and sound to the music folder, nothing else.
  if ((kind === "music") !== file.type.startsWith("audio/")) return Response.json({ error: `Unsupported type ${file.type}` }, { status: 415 });
  if (!extensionFor(file.type)) return Response.json({ error: `Unsupported type ${file.type}` }, { status: 415 });
  if (file.size > MAX_BYTES) {
    const hint = kind === "music" ? " Use a shorter loop or a lower bitrate (128 kbps MP3 is about 1 MB a minute), or paste a link instead." : "";
    return Response.json({ error: `File is larger than 4 MB.${hint}` }, { status: 413 });
  }
  try {
    const url = await storeUpload(kind as UploadKind, await file.arrayBuffer(), file.type);
    return Response.json({ url });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
