import type { UsagePurpose } from "./usageReport";
export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  // Offsets in content where a provider that needs explicit cache marks may cache up to. Never sent as is.
  cacheAt?: number[];
}

// Token counts the provider reports for one request. cachedTokens is null when it doesn't say.
export interface ChatUsage {
  promptTokens: number;
  cachedTokens: number | null;
  completionTokens: number;
}

export interface ChatOptions {
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  // The model stops before writing any of these (for example the user's name as a speaker).
  stop?: string[];
  signal?: AbortSignal;
  // Called with the provider's token counts, when it reports them (streaming: at the end).
  onUsage?: (usage: ChatUsage) => void;
  // Epoch ms by which the request, retries included, must have started answering. Failures that usually pass
  // (timeouts, overload, rate limits, dropped connections) are retried until then (lib/llm/retry.ts).
  deadline?: number;
  // What the request is for, for the Usage page. Defaults to "other".
  purpose?: UsagePurpose;
  // Called when the main model failed and the backup model is answering instead.
  onFallback?: (reason: string) => void;
  // False: one try only, errors reported at once (the connection test).
  retry?: boolean;
  // Groups requests that share a prompt start (one story), for providers that route caching by key.
  cacheKey?: string;
  // Defaults to the active connection (Connection page, else the LLM_* environment variables).
  connection?: { baseUrl: string; apiKey: string; model: string };
}
