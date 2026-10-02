import { checkProxyKey, corsPreflight, forward, proxyConnection, proxyError } from "@/lib/proxy/openaiProxy";

// OpenAI-style chat endpoint for other sites (see lib/proxy). Long replies stream for a while.
export const maxDuration = 300;

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: Request) {
  const denied = checkProxyKey(request);
  if (denied) return denied;
  const connection = await proxyConnection();
  if (connection instanceof Response) return connection;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return proxyError(400, "The request body is not valid JSON.");
  }
  // The other site may leave the model empty; the Connection page's model fills it in.
  if (typeof body.model !== "string" || !body.model.trim()) body.model = connection.model;

  return forward(connection, "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: request.headers.get("accept") ?? "application/json" },
    body: JSON.stringify(body),
    signal: request.signal,
  });
}
