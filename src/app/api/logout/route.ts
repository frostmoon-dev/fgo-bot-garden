import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth/token";

export async function POST() {
  (await cookies()).delete(AUTH_COOKIE);
  return Response.json({ ok: true });
}
