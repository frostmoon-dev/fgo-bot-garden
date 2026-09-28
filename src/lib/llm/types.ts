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
  // Groups requests that share a prompt start (one story), for providers that route caching by key.
  cacheKey?: string;
  // Defaults to the active connection (Connection page, else the LLM_* environment variables).
  connection?: { baseUrl: string; apiKey: string; model: string };
}
