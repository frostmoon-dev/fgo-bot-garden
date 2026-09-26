import "server-only";
import { db } from "@/lib/db";
import { canonicalize, toTranscript } from "@/lib/parser/transcript";
import type { ParserContext } from "@/lib/parser/types";
import { selectForSummary, type HistoryItem } from "./select";
import { summarize } from "./summarize";

// Folds old messages into the session summary once the history outgrows its budget.
// Runs after a reply has been sent, so the user never waits for it.
export async function foldHistory(
  sessionId: string,
  opts: { budget: number; keepRecent: number; ctx: ParserContext },
): Promise<void> {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      summary: true,
      summarizedUntil: true,
      messages: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { order: true, role: true, activeVariant: true, variants: { orderBy: { position: "asc" }, select: { content: true } } },
      },
    },
  });
  if (!session) return;

  const raw = (m: (typeof session.messages)[number]) => (m.variants[m.activeVariant] ?? m.variants.at(-1))?.content ?? "";
  // Measured in the form the prompt uses, so the budget matches what is really sent.
  const history: HistoryItem[] = session.messages.map((m) => ({
    order: m.order,
    role: m.role as HistoryItem["role"],
    content: m.role === "assistant" ? canonicalize(raw(m), opts.ctx) : raw(m),
  }));
  const { toSummarize } = selectForSummary(history, session.summarizedUntil, opts.budget, opts.keepRecent);
  if (!toSummarize.length) return;

  const byOrder = new Map(session.messages.map((m) => [m.order, m]));
  const transcript = toSummarize.map((item) => {
    const m = byOrder.get(item.order);
    return item.role === "assistant" && m ? { ...item, content: toTranscript(raw(m), opts.ctx) } : item;
  });
  const summary = await summarize(session.summary, transcript, { user: opts.ctx.userName });

  // Only apply if nothing else folded this session in the meantime.
  await db.session.updateMany({
    where: { id: sessionId, summarizedUntil: session.summarizedUntil },
    data: { summary, summarizedUntil: toSummarize.at(-1)!.order },
  });
}
