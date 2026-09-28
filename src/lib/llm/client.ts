import "server-only";
import { activeConnection, type LlmConnection } from "./connection";
import { stripReasoning, stripReasoningStream } from "./reasoning";
import { readSseDeltas } from "./sse";
import type { ChatMessage, ChatOptions } from "./types";

export function endpoint(connection: LlmConnection, path: string): string {
  return `${connection.baseUrl.replace(/\/+$/, "")}${path}`;
}

export function authHeaders(connection: LlmConnection): Record<string, string> {
  return connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : {};
}

function isAnthropic(connection: LlmConnection): boolean {
  return hostOf(connection) === "api.anthropic.com";
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

function hostOf(connection: LlmConnection): string {
  try {
    return new URL(connection.baseUrl).hostname;
  } catch {
    return "";
  }
}

// Most providers (OpenAI, DeepSeek, Grok, Gemini's implicit cache, local servers) reuse a repeated prompt start
// on their own. On OpenRouter, Anthropic, Gemini and Qwen models only cache what the request marks.
// https://openrouter.ai/docs/features/prompt-caching
function marksCache(connection: LlmConnection): boolean {
  return hostOf(connection) === "openrouter.ai" && /^(anthropic|google|qwen)\//i.test(connection.model);
}

// The messages as sent: only role and content. With cache marks, a marked message becomes text parts that
// end at each mark, the way those providers expect them.
export function wireMessages(messages: ChatMessage[], marks: boolean) {
  return messages.map(({ role, content, cacheAt }) => {
    const points = marks ? [...new Set(cacheAt ?? [])].filter((at) => at > 0 && at <= content.length).sort((a, b) => a - b) : [];
    if (!points.length) return { role, content };
    const parts: { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[] = [];
    let from = 0;
    for (const at of points) {
      parts.push({ type: "text", text: content.slice(from, at), cache_control: { type: "ephemeral" } });
      from = at;
    }
    if (from < content.length) parts.push({ type: "text", text: content.slice(from) });
    return { role, content: parts };
  });
}

// Servers that refused stream_options, so it isn't sent to them again (until the server restarts).
const noUsageOption = new Set<string>();

async function post(options: ChatOptions, stream: boolean): Promise<Response> {
  const connection = options.connection ?? (await activeConnection());
  const url = endpoint(connection, "/chat/completions");
  const send = (askUsage: boolean) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(connection) },
      // Optional parameters are only sent when set, since some providers reject ones they don't know.
      body: JSON.stringify({
        model: connection.model,
        messages: wireMessages(options.messages, marksCache(connection)),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        ...(options.topP !== undefined && options.topP < 1 && { top_p: options.topP }),
        ...(options.frequencyPenalty && { frequency_penalty: options.frequencyPenalty }),
        ...(options.presencePenalty && { presence_penalty: options.presencePenalty }),
        ...(options.stop?.length && { stop: options.stop.slice(0, 4) }),
        // OpenAI routes requests with the same key to the same cache. Other providers may reject the field.
        ...(options.cacheKey && hostOf(connection) === "api.openai.com" && { prompt_cache_key: options.cacheKey }),
        // Token counts at the end of the stream, including how much of the prompt came from the provider's cache.
        ...(askUsage && { stream_options: { include_usage: true } }),
        stream,
      }),
      signal: options.signal,
    });
  const askUsage = stream && !!options.onUsage && !noUsageOption.has(url);
  let res = await send(askUsage);
  // A server that doesn't know stream_options may reject the request: try once more without it.
  if (askUsage && (res.status === 400 || res.status === 422)) {
    await res.body?.cancel().catch(() => {});
    const retry = await send(false);
    if (retry.ok) noUsageOption.add(url);
    res = retry;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(describeFailure(res.status, text));
  }
  return res;
}

export async function* streamChat(options: ChatOptions): AsyncGenerator<string> {
  const res = await post(options, true);
  if (!res.body) throw new Error("The provider sent an empty response.");
  yield* stripReasoningStream(readSseDeltas(res.body, options.onUsage));
}

// Reasoning models (DeepSeek R1, Nemotron, Qwen and others on Nvidia, OpenRouter, local servers) think before
// they answer. With the small limits the helper requests use, the thinking can use up every token, leaving
// no answer. Then the request is sent once more with room to finish.
const THINKING_ROOM = 4;
const MAX_HELPER_TOKENS = 4000;

export async function completeChat(options: ChatOptions): Promise<string> {
  const once = async (maxTokens: number) => {
    const res = await post({ ...options, maxTokens }, false);
    const json = (await res.json()) as {
      choices?: { message?: { content?: string | null; reasoning_content?: string | null }; finish_reason?: string }[];
    };
    const choice = json.choices?.[0];
    const raw = choice?.message?.content ?? "";
    const cutOff = choice?.finish_reason === "length" || /<think/i.test(raw) || !!choice?.message?.reasoning_content;
    return { text: stripReasoning(raw), cutOff };
  };
  const first = await once(options.maxTokens);
  if (first.text.trim() || !first.cutOff || options.maxTokens >= MAX_HELPER_TOKENS) return first.text;
  return (await once(Math.min(MAX_HELPER_TOKENS, options.maxTokens * THINKING_ROOM))).text;
}
