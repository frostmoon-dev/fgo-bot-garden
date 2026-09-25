import { estimateTokens } from "@/lib/prompt/tokens";

export interface HistoryItem {
  order: number;
  role: "user" | "assistant";
  content: string;
}

// Decides which old messages to fold into the summary. Keeps at least `keepRecent` messages as-is.
export function selectForSummary(
  messages: HistoryItem[],
  summarizedUntil: number,
  budget: number,
  keepRecent: number,
): { toSummarize: HistoryItem[]; recent: HistoryItem[] } {
  const open = messages.filter((m) => m.order > summarizedUntil);
  const tokens = open.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  if (tokens <= budget || open.length <= keepRecent) return { toSummarize: [], recent: open };
  const cut = open.length - keepRecent;
  return { toSummarize: open.slice(0, cut), recent: open.slice(cut) };
}
