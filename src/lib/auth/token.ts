// Signed session token. Uses Web Crypto so it runs in the proxy and in route handlers.
export const AUTH_COOKIE = "fgo_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createToken(secret: string): Promise<string> {
  const expires = Date.now() + AUTH_MAX_AGE * 1000;
  const payload = String(expires);
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifyToken(secret: string | undefined, token: string | undefined): Promise<boolean> {
  if (!secret || !token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expires = Number(payload);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  return safeEqual(sig, await hmac(secret, payload));
}

export async function passwordMatches(secret: string, given: string, expected: string): Promise<boolean> {
  // Compare HMACs so the comparison time does not depend on the password.
  return safeEqual(await hmac(secret, given), await hmac(secret, expected));
}
