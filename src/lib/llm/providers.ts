// AI providers with an OpenAI-compatible chat API. Picking one fills in its address;
// "custom" takes any other OpenAI-compatible server.

export interface ProviderPreset {
  label: string;
  baseUrl: string;
  // Where to create an API key.
  keyUrl?: string;
  hint: string;
  // Local servers usually need no key.
  keyOptional?: boolean;
}

export const PROVIDERS = {
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    keyUrl: "https://platform.deepseek.com/api_keys",
    hint: "Inexpensive and strong at roleplay. Pay as you go.",
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keyUrl: "https://openrouter.ai/keys",
    hint: "One key for hundreds of models, some of them free.",
  },
  gemini: {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyUrl: "https://aistudio.google.com/apikey",
    hint: "Has a free tier with daily limits.",
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keyUrl: "https://platform.openai.com/api-keys",
    hint: "GPT models. Pay as you go.",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    keyUrl: "https://console.anthropic.com/settings/keys",
    hint: "Claude models through Anthropic's OpenAI-compatible endpoint. Penalty settings are ignored.",
  },
  nvidia: {
    label: "Nvidia",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    keyUrl: "https://build.nvidia.com/",
    hint: "Many open models (Llama, Nemotron, DeepSeek, Qwen…). Reasoning models think before answering, so replies take longer.",
  },
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    keyUrl: "https://console.groq.com/keys",
    hint: "Very fast open models, with a free tier.",
  },
  mistral: {
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    keyUrl: "https://console.mistral.ai/api-keys",
    hint: "Mistral's own models.",
  },
  xai: {
    label: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    keyUrl: "https://console.x.ai",
    hint: "Grok models.",
  },
  local: {
    label: "On this computer (Ollama, LM Studio, KoboldCpp)",
    baseUrl: "http://localhost:11434/v1",
    hint: "Only works while the app itself runs on your computer. A site on Vercel can't reach localhost. LM Studio uses port 1234, KoboldCpp 5001.",
    keyOptional: true,
  },
  custom: {
    label: "Other (OpenAI-compatible)",
    baseUrl: "",
    hint: "Any server with an OpenAI-style /chat/completions endpoint. Paste its base URL, usually ending in /v1.",
    keyOptional: true,
  },
} satisfies Record<string, ProviderPreset>;

export type ProviderId = keyof typeof PROVIDERS;

export function isProviderId(value: string): value is ProviderId {
  return value in PROVIDERS;
}

// The preset a saved address belongs to, for connections made before presets existed.
export function providerFor(baseUrl: string): ProviderId {
  const url = baseUrl.replace(/\/+$/, "");
  const found = (Object.entries(PROVIDERS) as [ProviderId, ProviderPreset][]).find(([, p]) => p.baseUrl && p.baseUrl === url);
  return found?.[0] ?? "custom";
}

// https everywhere, plain http only for servers on this machine or the local network.
export function checkBaseUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Enter the full address, starting with https://";
  }
  if (url.protocol === "https:") return null;
  const local = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|host\.docker\.internal|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|[\w-]+\.local)$/i;
  if (url.protocol === "http:" && local.test(url.hostname)) return null;
  return "Use an https:// address (plain http only works for a server on your own computer or network).";
}
