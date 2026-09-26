import "server-only";
import { completeChat } from "@/lib/llm/client";
import { aboutUser, SUMMARY_PROMPT, type PersonaInfo } from "@/lib/prompt/rules";
import type { HistoryItem } from "./select";

// The persona goes along so the memory gets the user's name, pronouns and facts right.
export async function summarize(
  previous: string,
  items: HistoryItem[],
  persona: PersonaInfo,
): Promise<string> {
  const transcript = items
    .map((m) => (m.role === "user" ? `${persona.name}: ${m.content}` : m.content))
    .join("\n");
  const text = await completeChat({
    messages: [
      { role: "system", content: SUMMARY_PROMPT },
      {
        role: "user",
        content: `${aboutUser(persona, 600)}\n\nPrevious memory:\n${previous.trim() || "(none)"}\n\nNew events:\n${transcript}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 700,
  });
  return text.trim() || previous;
}
