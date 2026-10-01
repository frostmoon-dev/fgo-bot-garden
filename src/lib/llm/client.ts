import "server-only";
import { activeConnection, backupConnection, helperConnection, type LlmConnection } from "./connection";
import { stripReasoning, stripReasoningStream } from "./reasoning";
import {
  COMPLETE_MS,
  DEFAULT_BUDGET_MS,
  isNetworkError,
  isRetryableStatus,
  parseRetryAfter,
  RetryableError,
  retryDelay,
  sleep,
  STREAM_IDLE_MS,
  STREAM_START_MS,
} from "./retry";
import { readSseDeltas, readUsage } from "./sse";
import type { ChatMessage, ChatOptions, ChatUsage } from "./types";
import { reportUsage } from "./usageReport";

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

// One try at a request. The answer must start within `timeoutMs` (the whole answer, when not streamed: call
// release() once the body is read). A timeout, a dropped connection or a "try again later" status becomes a
// RetryableError; anything else (a wrong key, a bad model id) fails at once.
async function postOnce(
  options: ChatOptions,
  stream: boolean,
  timeoutMs: number,
): Promise<{ res: Response; release: () => void; model: string }> {
  const connection = options.connection ?? (await activeConnection());
  const url = endpoint(connection, "/chat/completions");
  const attempt = new AbortController();
  const onAbort = () => attempt.abort(options.signal!.reason);
  if (options.signal?.aborted) throw options.signal.reason;
  options.signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(
    () => attempt.abort(new RetryableError(`The model didn't answer within ${Math.round(timeoutMs / 1000)} seconds.`)),
    timeoutMs,
  );
  const release = () => clearTimeout(timer);
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
      signal: attempt.signal,
    });
  try {
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
      const message = describeFailure(res.status, text);
      if (isRetryableStatus(res.status)) throw new RetryableError(message, parseRetryAfter(res.headers.get("retry-after")));
      throw new Error(message);
    }
    // A stream has started: from here the reader watches for it going quiet.
    if (stream) release();
    return { res, release, model: connection.model };
  } catch (error) {
    release();
    throw asRetryable(error, attempt.signal, options.signal);
  }
}

// What a failed try means: the user stopped it (not retried), it timed out, or the connection broke.
function asRetryable(error: unknown, attempt: AbortSignal, user?: AbortSignal): unknown {
  if (user?.aborted) return error;
  if (attempt.aborted && attempt.reason instanceof RetryableError) return attempt.reason;
  if (isNetworkError(error)) return new RetryableError(`The connection to the provider broke (${(error as Error).message}).`);
  return error;
}

// Runs a try again and again while it fails with a RetryableError, waiting a little longer each time,
// until the deadline. Then the last error is reported, saying how often it was tried.
async function withRetry<T>(options: ChatOptions, deadline: number, run: (timeLeft: number) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run(Math.max(MIN_TRY_MS, deadline - Date.now()));
    } catch (error) {
      if (options.signal?.aborted || !(error instanceof RetryableError)) throw error;
      if (options.retry === false) throw new Error(error.message);
      const wait = retryDelay(attempt, error.retryAfter);
      if (Date.now() + wait + MIN_TRY_MS > deadline) {
        throw new Error(`${error.message} Tried ${attempt} time${attempt === 1 ? "" : "s"}, then gave up. Try again in a moment.`);
      }
      console.warn(`Model request failed, retry ${attempt} in ${wait} ms: ${error.message}`);
      await sleep(wait, options.signal);
    }
  }
}

// A retry only starts if at least this much time is left for it.
const MIN_TRY_MS = 10_000;

async function* streamFrom(options: ChatOptions): AsyncGenerator<string> {
  const deadline = options.deadline ?? Date.now() + DEFAULT_BUDGET_MS;
  let retriedEmpty = false;
  for (let attempt = 1; ; attempt++) {
    const { res, model } = await withRetry(options, deadline, (left) => postOnce(options, true, Math.min(STREAM_START_MS, left)));
    if (!res.body) throw new Error("The provider sent an empty response.");
    let yielded = false;
    let usage: ChatUsage | null = null;
    const onUsage = (u: ChatUsage) => {
      usage = u;
      options.onUsage?.(u);
    };
    try {
      for await (const delta of stripReasoningStream(readSseDeltas(res.body, onUsage, STREAM_IDLE_MS))) {
        if (!delta) continue;
        yielded = true;
        yield delta;
      }
    } catch (error) {
      // Once text has reached the reader it can't be taken back: what arrived is kept and the error reported.
      const retryable = asRetryable(error, new AbortController().signal, options.signal);
      if (yielded || !(retryable instanceof RetryableError) || options.retry === false) throw retryable;
      const wait = retryDelay(attempt, retryable.retryAfter);
      if (Date.now() + wait + MIN_TRY_MS > deadline) throw retryable;
      console.warn(`Model stream failed before any text, retry ${attempt} in ${wait} ms: ${retryable.message}`);
      await sleep(wait, options.signal);
      continue;
    }
    reportUsage({ purpose: options.purpose ?? "other", model, usage });
    // Overloaded free providers sometimes end the stream without a word: ask once more.
    if (yielded || retriedEmpty || Date.now() + MIN_TRY_MS > deadline) return;
    retriedEmpty = true;
    console.warn("Model sent an empty reply, asking once more");
  }
}

// The main model gets this share of the time when a backup is saved; the backup gets the rest.
const MAIN_SHARE = 0.6;

// The backup model, when the request uses the main one and a backup is saved. Then onFallback is told, so
// the reader can be shown which model answered.
async function backupFor(options: ChatOptions): Promise<LlmConnection | null> {
  return options.connection ? null : backupConnection().catch(() => null);
}

export async function* streamChat(options: ChatOptions): AsyncGenerator<string> {
  const backup = await backupFor(options);
  if (!backup) return yield* streamFrom(options);
  const deadline = options.deadline ?? Date.now() + DEFAULT_BUDGET_MS;
  let yielded = false;
  let mainError = "";
  try {
    for await (const delta of streamFrom({ ...options, deadline: Date.now() + (deadline - Date.now()) * MAIN_SHARE })) {
      yielded = true;
      yield delta;
    }
    return;
  } catch (error) {
    // Text already shown can't be continued by another model; a stop from the reader is not a failure.
    if (yielded || options.signal?.aborted) throw error;
    mainError = error instanceof Error ? error.message : String(error);
    console.warn(`Main model failed, using the backup: ${mainError}`);
    options.onFallback?.(mainError);
  }
  let backupYielded = false;
  try {
    for await (const delta of streamFrom({ ...options, connection: backup, deadline })) {
      backupYielded = true;
      yield delta;
    }
  } catch (error) {
    if (backupYielded || options.signal?.aborted) throw error;
    throw bothFailed(mainError, error);
  }
}

// Both models failed: say both, so the main model's problem isn't hidden behind the backup's.
function bothFailed(main: string, backup: unknown): Error {
  return new Error(`The main model failed: ${main} The backup model failed too: ${backup instanceof Error ? backup.message : String(backup)}`);
}

// Reasoning models (DeepSeek R1, Nemotron, Qwen and others on Nvidia, OpenRouter, local servers) think before
// they answer. With the small limits the helper requests use, the thinking can use up every token, leaving
// no answer. Then the request is sent once more with room to finish.
const THINKING_ROOM = 4;
const MAX_HELPER_TOKENS = 4000;

async function completeFrom(options: ChatOptions): Promise<string> {
  const deadline = options.deadline ?? Date.now() + DEFAULT_BUDGET_MS;
  const once = async (maxTokens: number) => {
    const json = await withRetry(options, deadline, async (left) => {
      const { res, release, model } = await postOnce({ ...options, maxTokens }, false, Math.min(COMPLETE_MS, left));
      try {
        const body = (await res.json()) as {
          choices?: { message?: { content?: string | null; reasoning_content?: string | null }; finish_reason?: string }[];
          usage?: Parameters<typeof readUsage>[0];
        };
        reportUsage({ purpose: options.purpose ?? "other", model, usage: readUsage(body.usage) });
        return body;
      } catch (error) {
        throw asRetryable(error, new AbortController().signal, options.signal);
      } finally {
        release();
      }
    });
    const choice = json.choices?.[0];
    const raw = choice?.message?.content ?? "";
    const cutOff = choice?.finish_reason === "length" || /<think/i.test(raw) || !!choice?.message?.reasoning_content;
    return { text: stripReasoning(raw), cutOff };
  };
  const first = await once(options.maxTokens);
  if (first.text.trim() || !first.cutOff || options.maxTokens >= MAX_HELPER_TOKENS) return first.text;
  return (await once(Math.min(MAX_HELPER_TOKENS, options.maxTokens * THINKING_ROOM))).text;
}

// A small background request (scene box, choices, summary, memory) the settings send to the backup model.
async function helperFor(options: ChatOptions): Promise<LlmConnection | null> {
  if (options.connection) return null;
  try {
    return await helperConnection(options.purpose);
  } catch {
    return null;
  }
}

export async function completeChat(options: ChatOptions): Promise<string> {
  // Background jobs on the backup model keep the main one free for story replies. If the backup can't do
  // the job, the main model does it, so nothing is skipped.
  const helper = await helperFor(options);
  if (helper) {
    const deadline = options.deadline ?? Date.now() + DEFAULT_BUDGET_MS;
    try {
      return await completeFrom({ ...options, connection: helper, deadline: Date.now() + (deadline - Date.now()) * 0.5 });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      console.warn(`The backup model failed a ${options.purpose} request; the main model does it: ${error instanceof Error ? error.message : error}`);
      return completeFrom({ ...options, deadline });
    }
  }
  const backup = await backupFor(options);
  if (!backup) return completeFrom(options);
  const deadline = options.deadline ?? Date.now() + DEFAULT_BUDGET_MS;
  try {
    return await completeFrom({ ...options, deadline: Date.now() + (deadline - Date.now()) * MAIN_SHARE });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    const mainError = error instanceof Error ? error.message : String(error);
    console.warn(`Main model failed, using the backup: ${mainError}`);
    options.onFallback?.(mainError);
    try {
      return await completeFrom({ ...options, connection: backup, deadline });
    } catch (backupError) {
      if (options.signal?.aborted) throw backupError;
      throw bothFailed(mainError, backupError);
    }
  }
}
