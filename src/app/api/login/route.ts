import { cookies } from "next/headers";
import { AUTH_COOKIE, AUTH_MAX_AGE, createToken, passwordMatches } from "@/lib/auth/token";

// Simple per-instance throttle. Good enough for a single-user site.
const attempts = new Map<string, { count: number; until: number }>();

export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET;
  const expected = process.env.APP_PASSWORD;
  if (!secret || secret.length < 32 || !expected) {
    return Response.json({ error: "Server is missing APP_PASSWORD or AUTH_SECRET" }, { status: 500 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const entry = attempts.get(ip);
  if (entry && entry.count >= 5 && entry.until > Date.now()) {
    return Response.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!(await passwordMatches(secret, password, expected))) {
    const count = (entry && entry.until > Date.now() ? entry.count : 0) + 1;
    attempts.set(ip, { count, until: Date.now() + 60_000 });
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  attempts.delete(ip);

  const jar = await cookies();
  jar.set(AUTH_COOKIE, await createToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return Response.json({ ok: true });
}
