import "server-only";
import { completeChat } from "@/lib/llm/client";
import { SUMMARY_PROMPT } from "@/lib/prompt/rules";
import type { HistoryItem } from "./select";

export async function summarize(
  previous: string,
  items: HistoryItem[],
  names: { user: string },
): Promise<string> {
  const transcript = items
    .map((m) => (m.role === "user" ? `${names.user}: ${m.content}` : m.content))
    .join("\n");
  const text = await completeChat({
    messages: [
      { role: "system", content: SUMMARY_PROMPT },
      {
        role: "user",
        content: `Previous summary:\n${previous.trim() || "(none)"}\n\nNew events:\n${transcript}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 500,
  });
  return text.trim() || previous;
}
