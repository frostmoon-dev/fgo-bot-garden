import "server-only";
import { timingSafeEqual } from "node:crypto";
import { activeConnection, type LlmConnection } from "@/lib/llm/connection";
import { authHeaders, endpoint } from "@/lib/llm/client";

// An OpenAI-style endpoint for other chat sites (JanitorAI and the like). They call it from the browser, which
// providers such as NVIDIA refuse (no CORS headers). This server forwards the request to the main model on the
// Connection page with its saved key, and answers with the headers browsers need. Other sites get a separate
// password (PROXY_KEY), never the provider's key.

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// OpenAI-shaped errors, so the other site shows the message.
export function proxyError(status: number, message: string): Response {
  return Response.json({ error: { message, type: "proxy_error" } }, { status, headers: CORS_HEADERS });
}

function samePassword(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Checks the caller's password; returns an error response, or null when the request may go through.
export function checkProxyKey(request: Request): Response | null {
  const key = process.env.PROXY_KEY?.trim();
  if (!key) return proxyError(503, "The proxy is off. Set PROXY_KEY in the site's environment variables to turn it on.");
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!given || !samePassword(given, key)) return proxyError(401, "Wrong proxy key. Use the PROXY_KEY you set for this site as the API key.");
  return null;
}

export async function proxyConnection(): Promise<LlmConnection | Response> {
  try {
    return await activeConnection();
  } catch {
    return proxyError(503, "No model is connected on this site yet. Add one on its Connection page.");
  }
}

// Forwards a request upstream and streams the answer back as it arrives.
export async function forward(connection: LlmConnection, path: string, init: RequestInit): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(endpoint(connection, path), {
      ...init,
      headers: { ...authHeaders(connection), ...(init.headers as Record<string, string>) },
    });
  } catch (error) {
    return proxyError(502, `The model's server could not be reached: ${error instanceof Error ? error.message : "network error"}`);
  }
  const headers = new Headers(CORS_HEADERS);
  for (const name of ["content-type", "cache-control", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
