import "server-only";
import { activeConnection, type LlmConnection } from "./connection";
import { stripReasoning, stripReasoningStream } from "./reasoning";
import { readSseDeltas } from "./sse";
import type { ChatOptions } from "./types";

export function endpoint(connection: LlmConnection, path: string): string {
  return `${connection.baseUrl.replace(/\/+$/, "")}${path}`;
}

export function authHeaders(connection: LlmConnection): Record<string, string> {
  return connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : {};
}

function isAnthropic(connection: LlmConnection): boolean {
  try {
    return new URL(connection.baseUrl).hostname === "api.anthropic.com";
  } catch {
    return false;
  }
}

// The model list request. Anthropic only makes chat OpenAI-compatible: its model list is the native API, which
// takes the key as x-api-key, needs an anthropic-version header, and sends 20 models a page unless asked for more.
export function modelsRequest(connection: LlmConnection): { url: string; headers: Record<string, string> } {
  if (!isAnthropic(connection)) return { url: endpoint(connection, "/models"), headers: authHeaders(connection) };
  return {
    url: endpoint(connection, "/models?limit=1000"),
    headers: { ...(connection.apiKey && { "x-api-key": connection.apiKey }), "anthropic-version": "2023-06-01" },
  };
}

// Plain words for the errors people actually hit, with the provider's own message after them.
export function describeFailure(status: number, body: string): string {
  const reason =
    status === 401 || status === 403
      ? "The API key was refused. Check it on the Connection page."
      : status === 402
        ? "The provider says the account is out of credits."
        : status === 404
          ? "Not found. Check the address and the model id on the Connection page."
          : status === 429
            ? "Too many requests, or the free limit is used up. Wait a moment and try again."
            : status >= 500
              ? "The provider is having trouble. Try again in a moment."
              : "The provider rejected the request.";
  const detail = body.replace(/\s+/g, " ").trim().slice(0, 240);
  return `${reason} (${status}${detail ? `: ${detail}` : ""})`;
}

async function post(options: ChatOptions, stream: boolean): Promise<Response> {
  const connection = options.connection ?? (await activeConnection());
  const res = await fetch(endpoint(connection, "/chat/completions"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(connection) },
    // Optional parameters are only sent when set, since some providers reject ones they don't know.
    body: JSON.stringify({
      model: connection.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      ...(options.topP !== undefined && options.topP < 1 && { top_p: options.topP }),
      ...(options.frequencyPenalty && { frequency_penalty: options.frequencyPenalty }),
      ...(options.presencePenalty && { presence_penalty: options.presencePenalty }),
      ...(options.stop?.length && { stop: options.stop.slice(0, 4) }),
      stream,
    }),
    signal: options.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(describeFailure(res.status, text));
  }
  return res;
}

export async function* streamChat(options: ChatOptions): AsyncGenerator<string> {
  const res = await post(options, true);
  if (!res.body) throw new Error("The provider sent an empty response.");
  yield* stripReasoningStream(readSseDeltas(res.body));
}

export async function completeChat(options: ChatOptions): Promise<string> {
  const res = await post(options, false);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return stripReasoning(json.choices?.[0]?.message?.content ?? "");
}
