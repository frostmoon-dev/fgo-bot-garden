import { checkProxyKey, corsPreflight, forward, proxyConnection } from "@/lib/proxy/openaiProxy";

// The model list, for sites that check the connection or offer a model picker (see lib/proxy).
export function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const denied = checkProxyKey(request);
  if (denied) return denied;
  const connection = await proxyConnection();
  if (connection instanceof Response) return connection;
  return forward(connection, "/models", { method: "GET" });
}
