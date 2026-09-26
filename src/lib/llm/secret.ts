import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// API keys are stored encrypted (AES-256-GCM) with a key derived from AUTH_SECRET, so a leaked
// database dump alone does not reveal them. Changing AUTH_SECRET makes saved keys unreadable;
// the Connection page then asks for the key again.

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set (at least 32 characters) to save an API key.");
  return createHash("sha256").update("bot-garden/api-key/v1\0").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

// Null when there is nothing saved or it can't be read (for example after AUTH_SECRET changed).
export function decryptSecret(stored: string): string | null {
  const [version, iv, tag, data] = stored.split(":");
  if (version !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// "…a1b2": enough to recognise a key, never enough to use it.
export function keyHint(plain: string): string {
  return plain.length > 8 ? `…${plain.slice(-4)}` : "…";
}
