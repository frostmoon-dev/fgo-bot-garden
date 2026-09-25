import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken } from "./token";

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(process.env.AUTH_SECRET, jar.get(AUTH_COOKIE)?.value);
}

// Call at the top of every server action. The proxy also checks, this is the second line.
export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) throw new Error("Not signed in");
}
