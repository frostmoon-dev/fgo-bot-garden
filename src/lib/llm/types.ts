export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
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
  // Defaults to the active connection (Connection page, else the LLM_* environment variables).
  connection?: { baseUrl: string; apiKey: string; model: string };
}
