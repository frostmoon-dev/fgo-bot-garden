import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth/token";

export async function proxy(request: NextRequest) {
  const ok = await verifyToken(process.env.AUTH_SECRET, request.cookies.get(AUTH_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the login page/API, Next internals, and static files.
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|assets/|uploads/).*)"],
};
