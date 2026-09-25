import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export type UploadKind = "sprites" | "backgrounds";

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/avif": "avif",
};

export function extensionFor(mime: string): string | null {
  return MIME_EXT[mime] ?? null;
}

let bucketReady = false;

async function uploadToSupabase(key: string, data: ArrayBuffer, mime: string): Promise<string> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET } = env();
  const client = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  if (!bucketReady) {
    const { data: bucket } = await client.storage.getBucket(SUPABASE_BUCKET);
    if (!bucket) {
      const { error } = await client.storage.createBucket(SUPABASE_BUCKET, { public: true });
      if (error && !/already exists/i.test(error.message)) throw new Error(`Could not create bucket: ${error.message}`);
    }
    bucketReady = true;
  }
  const { error } = await client.storage
    .from(SUPABASE_BUCKET)
    .upload(key, data, { contentType: mime, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return client.storage.from(SUPABASE_BUCKET).getPublicUrl(key).data.publicUrl;
}

async function uploadToLocal(key: string, data: ArrayBuffer): Promise<string> {
  if (process.env.VERCEL) {
    throw new Error("Uploads on Vercel need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const file = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(data));
  return `/uploads/${key}`;
}

export async function storeUpload(kind: UploadKind, data: ArrayBuffer, mime: string): Promise<string> {
  const ext = extensionFor(mime);
  if (!ext) throw new Error(`Unsupported file type: ${mime}`);
  const key = `${kind}/${crypto.randomUUID()}.${ext}`;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env();
  return SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? uploadToSupabase(key, data, mime) : uploadToLocal(key, data);
}
