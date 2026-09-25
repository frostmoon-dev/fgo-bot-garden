import { z } from "zod";
import { isAuthed } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getPersona, getSettings } from "@/lib/data/queries";
import { streamChat } from "@/lib/llm/client";
import { STREAM_ERROR_MARKER } from "@/lib/llm/protocol";
import { getTriggeredLore } from "@/lib/lorebook";
import { localLoreProvider } from "@/lib/lorebook/localProvider";
import type { Mode } from "@/lib/parser/types";
import { buildPrompt } from "@/lib/prompt/builder";
import { selectForSummary, type HistoryItem } from "@/lib/summary/select";
import { summarize } from "@/lib/summary/summarize";

export const maxDuration = 60;

const bodySchema = z.object({
  sessionId: z.string().min(1),
  action: z.enum(["reply", "regenerate"]),
  text: z.string().max(20000).optional(),
});

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!(await isAuthed())) return jsonError(401, "Not signed in");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Invalid request");
  const { sessionId, action } = parsed.data;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      cast: { include: { character: { include: { expressions: { orderBy: { sortOrder: "asc" } } } } } },
      messages: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { variants: { orderBy: { position: "asc" } } },
      },
    },
  });
  if (!session) return jsonError(404, "Session not found");

  const [persona, settings, backgrounds] = await Promise.all([
    getPersona(),
    getSettings(),
    db.background.findMany({ orderBy: { key: "asc" } }),
  ]);

  const content = (m: (typeof session.messages)[number]) =>
    (m.variants[m.activeVariant] ?? m.variants.at(-1))?.content ?? "";
  let history: HistoryItem[] = session.messages.map((m) => ({
    order: m.order,
    role: m.role as HistoryItem["role"],
    content: content(m),
  }));
  const nextOrder = (history.at(-1)?.order ?? -1) + 1;

  // Work out which message the new text belongs to.
  let target: { kind: "new"; order: number } | { kind: "variant"; messageId: string; position: number };
  let userMessageId: string | null = null;
  const userText = parsed.data.text?.trim() ?? "";

  if (action === "regenerate" && session.messages.at(-1)?.role === "assistant") {
    const last = session.messages.at(-1)!;
    target = { kind: "variant", messageId: last.id, position: (last.variants.at(-1)?.position ?? -1) + 1 };
    history = history.slice(0, -1);
  } else if (action === "reply" && userText) {
    const created = await db.message.create({
      data: { sessionId, order: nextOrder, role: "user", variants: { create: [{ position: 0, content: userText }] } },
    });
    userMessageId = created.id;
    history.push({ order: nextOrder, role: "user", content: userText });
    target = { kind: "new", order: nextOrder + 1 };
  } else {
    target = { kind: "new", order: nextOrder };
  }

  // Fold old messages into the summary when the history is too long.
  let summary = session.summary;
  let summaryUpdated = false;
  const { toSummarize, recent } = selectForSummary(
    history,
    session.summarizedUntil,
    settings.contextBudget,
    settings.keepRecent,
  );
  if (toSummarize.length) {
    try {
      summary = await summarize(summary, toSummarize, { user: persona.name });
      await db.session.update({
        where: { id: sessionId },
        data: { summary, summarizedUntil: toSummarize.at(-1)!.order },
      });
      summaryUpdated = true;
    } catch (error) {
      console.error("Summary failed, sending full history instead", error);
    }
  }
  const promptHistory = summaryUpdated ? recent : history.filter((m) => m.order > session.summarizedUntil);

  const scanTexts = history.slice(-settings.loreScanDepth).map((m) => m.content);
  const lore = await getTriggeredLore(localLoreProvider, scanTexts);

  const mode = session.mode as Mode;
  const prompt = buildPrompt({
    mode,
    mainCharacterId: session.mainCharacterId,
    cast: session.cast.map(({ character: c }) => ({
      id: c.id,
      name: c.name,
      aliases: c.aliases,
      description: c.description,
      personality: c.personality,
      speechStyle: c.speechStyle,
      lore: c.lore,
      relationship: c.relationship,
      scenario: c.scenario,
      exampleDialogues: c.exampleDialogues,
      expressions: c.expressions.map(({ key, label, description }) => ({ key, label, description })),
    })),
    backgrounds,
    persona,
    lore,
    summary,
    history: promptHistory.map(({ role, content }) => ({ role, content })),
    continueScene: action === "reply" && !userText,
  });

  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());

  const iterator = streamChat({
    messages: prompt.messages,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    signal: abort.signal,
  })[Symbol.asyncIterator]();

  // Wait for the first chunk so a failed request can still return a proper error status.
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (error) {
    if (userMessageId) await db.message.delete({ where: { id: userMessageId } }).catch(() => {});
    return jsonError(502, error instanceof Error ? error.message : "LLM request failed");
  }

  const messageId = target.kind === "variant" ? target.messageId : crypto.randomUUID();
  const encoder = new TextEncoder();

  const persist = async (text: string) => {
    if (!text.trim()) return;
    if (target.kind === "variant") {
      await db.messageVariant.create({ data: { messageId, position: target.position, content: text } });
      const count = await db.messageVariant.count({ where: { messageId } });
      await db.message.update({ where: { id: messageId }, data: { activeVariant: count - 1 } });
    } else {
      await db.message.create({
        data: {
          id: messageId,
          sessionId,
          order: target.order,
          role: "assistant",
          variants: { create: [{ position: 0, content: text }] },
        },
      });
    }
    await db.session.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // The client went away; keep collecting so the text is still saved.
        }
      };
      try {
        if (!first.done) {
          full += first.value;
          send(first.value);
        }
        while (true) {
          const next = await iterator.next();
          if (next.done) break;
          full += next.value;
          send(next.value);
        }
      } catch (error) {
        if (!abort.signal.aborted) {
          console.error("Stream failed", error);
          send(STREAM_ERROR_MARKER + (error instanceof Error ? error.message : "stream failed"));
        }
      }
      try {
        await persist(full);
      } catch (error) {
        console.error("Could not save reply", error);
        send(STREAM_ERROR_MARKER + "Reply could not be saved");
      }
      try {
        controller.close();
      } catch {
        // already closed
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Message-Id": messageId,
      "X-User-Message-Id": userMessageId ?? "",
      "X-Prompt-Tokens": String(prompt.tokens),
      "X-Summary-Updated": summaryUpdated ? "1" : "0",
    },
  });
}
