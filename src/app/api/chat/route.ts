import { after } from "next/server";
import { z } from "zod";
import { isAuthed } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getPersona, getSettings, listBackgrounds } from "@/lib/data/queries";
import { streamChat } from "@/lib/llm/client";
import { STREAM_ERROR_MARKER, STREAM_USAGE_MARKER } from "@/lib/llm/protocol";
import type { ChatUsage } from "@/lib/llm/types";
import { getTriggeredLore } from "@/lib/lorebook";
import { localLoreProvider } from "@/lib/lorebook/localProvider";
import { availableExpressions, pickAscension, pickProfile, resolveProfile } from "@/lib/ascension";
import { bondPrompt, bondSpeakers } from "@/lib/bond";
import { ScriptParser, userAliases } from "@/lib/parser/scriptParser";
import { canonicalize } from "@/lib/parser/transcript";
import { userTextForPrompt } from "@/lib/userInput";
import type { Mode, ParserContext } from "@/lib/parser/types";
import { buildPrompt } from "@/lib/prompt/builder";
import { formChangeNote, pendingFormChanges } from "@/lib/story/formChange";
import { formerCast } from "@/lib/story/formerCast";
import { updateCharacterMemories } from "@/lib/memory/characterMemory";
import { foldHistory } from "@/lib/summary/fold";

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

  // All reads at once. Persona, settings and backgrounds usually come from the cache.
  const [session, persona, settings, backgrounds, everyone] = await Promise.all([
    db.session.findUnique({
      where: { id: sessionId },
      include: {
        cast: {
          include: {
            character: {
              include: {
                expressions: { orderBy: { sortOrder: "asc" } },
                spriteSets: { include: { faces: { select: { cellIndex: true, expression: { select: { key: true } } } } } },
              },
            },
          },
        },
        messages: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: { variants: { orderBy: { position: "asc" }, select: { position: true, content: true } } },
        },
      },
    }),
    getPersona(),
    getSettings(),
    listBackgrounds(),
    db.character.findMany({ select: { id: true, name: true, aliases: true } }),
  ]);
  if (!session) return jsonError(404, "Session not found");

  const mode = session.mode as Mode;
  // Each cast member speaks as the ascension chosen for this story: its definition and its faces.
  const cast = session.cast.map(({ character: c, spriteSetId }) => {
    const set = pickAscension(c, spriteSetId);
    const faces = set ? Object.fromEntries(set.faces.map((f) => [f.expression.key, f.cellIndex])) : null;
    // With one ascension there's nothing to tell apart, so the form is only named when there are several.
    const forms = c.spriteSets.length > 1 && set ? { form: set.name, otherForms: c.spriteSets.filter((s) => s.id !== set.id).map((s) => s.name) } : {};
    return { character: c, profile: resolveProfile(pickProfile(c), set), expressions: availableExpressions(c.expressions, faces), forms };
  });
  const parserCtx: ParserContext = {
    characters: cast.map(({ character: c, expressions }) => ({
      id: c.id,
      name: c.name,
      aliases: c.aliases,
      expressions: expressions.map((e) => e.key),
    })),
    backgrounds: backgrounds.map((b) => b.key),
    mode,
    mainCharacterId: session.mainCharacterId,
    userName: persona.name,
    userAliases: userAliases(persona.addressAs),
  };

  const content = (m: (typeof session.messages)[number]) =>
    (m.variants[m.activeVariant] ?? m.variants.at(-1))?.content ?? "";
  // The model copies its own earlier replies, so it gets them back in clean script format.
  let history = session.messages.map((m) => ({
    order: m.order,
    role: m.role as "user" | "assistant",
    pinned: m.pinned,
    content: m.role === "assistant" ? canonicalize(content(m), parserCtx) : userTextForPrompt(content(m)),
  }));
  const nextOrder = (session.messages.at(-1)?.order ?? -1) + 1;

  // Work out which message the new text belongs to.
  let target:
    | { kind: "new"; order: number }
    | { kind: "variant"; messageId: string; position: number; index: number };
  let createUser: Promise<{ id: string }> | null = null;
  const userText = parsed.data.text?.trim() ?? "";

  if (action === "regenerate" && session.messages.at(-1)?.role === "assistant") {
    const last = session.messages.at(-1)!;
    target = {
      kind: "variant",
      messageId: last.id,
      position: (last.variants.at(-1)?.position ?? -1) + 1,
      index: last.variants.length,
    };
    history = history.slice(0, -1);
  } else if (action === "reply" && userText) {
    // Saved while the model starts, rather than before it.
    createUser = db.message.create({
      data: { sessionId, order: nextOrder, role: "user", variants: { create: [{ position: 0, content: userText }] } },
      select: { id: true },
    });
    createUser.catch(() => {});
    history.push({ order: nextOrder, role: "user", pinned: false, content: userTextForPrompt(userText) });
    target = { kind: "new", order: nextOrder + 1 };
  } else {
    target = { kind: "new", order: nextOrder };
  }

  // A form switched since the characters last spoke gets a one-time note, so they react to it.
  const past = target.kind === "variant" ? session.messages.slice(0, -1) : session.messages;
  // Characters taken out of the cast who still have lines in the history: the model is told they are gone.
  const absent = formerCast(session.messages.map(content), everyone, new Set(cast.map(({ character: c }) => c.id))).map((c) => c.name);
  const events = pendingFormChanges(past.map((m) => ({ role: m.role, content: content(m) }))).map(formChangeNote);

  const scanTexts = history.slice(-settings.loreScanDepth).map((m) => m.content);
  const lore = await getTriggeredLore(localLoreProvider, scanTexts);

  const prompt = buildPrompt({
    mode,
    mainCharacterId: session.mainCharacterId,
    cast: cast.map(({ character: c, profile, expressions, forms }) => ({
      id: c.id,
      name: c.name,
      aliases: c.aliases,
      description: profile.description,
      personality: profile.personality,
      speechStyle: profile.speechStyle,
      lore: profile.lore,
      relationship: profile.relationship,
      scenario: profile.scenario,
      exampleDialogues: profile.exampleDialogues,
      expressions: expressions.map(({ key, label, description }) => ({ key, label, description })),
      bond: bondPrompt(c.bond),
      memories: settings.characterMemory ? c.memories : "",
      ...forms,
    })),
    backgrounds,
    persona,
    lore,
    summary: session.summary,
    memory: session.memory,
    scene: session.scene,
    events,
    absent,
    // Pins that were folded into the summary still go in word for word.
    pinned: history.filter((m) => m.pinned && m.order <= session.summarizedUntil).map((m) => m.content),
    history: history
      .filter((m) => m.order > session.summarizedUntil && m.content.trim())
      .map(({ role, content, pinned }) => ({ role, content, pinned })),
    continueScene: action === "reply" && !userText,
    options: {
      profile: settings.promptProfile,
      exampleMode: settings.exampleMode,
      memoryPlacement: settings.memoryPlacement,
      formatReminder: settings.formatReminder,
      customPrompt: settings.customPrompt,
      replyLength: settings.replyLength,
      contextSize: settings.contextSize,
      replyTokens: settings.maxTokens,
    },
  });

  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());

  const user = persona.name;
  let usage: ChatUsage | null = null;
  const iterator = streamChat({
    messages: prompt.messages,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    topP: settings.topP,
    frequencyPenalty: settings.frequencyPenalty,
    presencePenalty: settings.presencePenalty,
    // Stop the model before it starts a line for the user's character.
    stop: settings.stopAtUser ? [`\n${user}:`, `\n[${user}|`, `\n[${user}]`, `\n${user}|`] : undefined,
    signal: abort.signal,
    onUsage: (u) => {
      usage = u;
    },
  })[Symbol.asyncIterator]();

  // Wait for the first chunk so a failed request can still return a proper error status.
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (error) {
    if (createUser) await createUser.then(({ id }) => db.message.delete({ where: { id } })).catch(() => {});
    return jsonError(502, error instanceof Error ? error.message : "LLM request failed");
  }
  let userMessageId: string | null = null;
  try {
    userMessageId = createUser ? (await createUser).id : null;
  } catch (error) {
    abort.abort();
    console.error("Could not save the user's message", error);
    return jsonError(500, "Your message could not be saved");
  }

  const messageId = target.kind === "variant" ? target.messageId : crypto.randomUUID();
  const encoder = new TextEncoder();

  const persist = async (text: string) => {
    if (!text.trim()) return;
    const touch = db.session.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    if (target.kind === "variant") {
      await Promise.all([
        db.messageVariant.create({ data: { messageId, position: target.position, content: text } }),
        db.message.update({ where: { id: messageId }, data: { activeVariant: target.index } }),
        touch,
      ]);
    } else {
      // Bond grows with each answered message, for every cast member who spoke in the reply.
      const speakers = userMessageId ? bondSpeakers(new ScriptParser(parserCtx).parseText(text)) : [];
      await Promise.all([
        db.message.create({
          data: {
            id: messageId,
            sessionId,
            order: target.order,
            role: "assistant",
            variants: { create: [{ position: 0, content: text }] },
          },
        }),
        touch,
        speakers.length > 0 && db.character.updateMany({ where: { id: { in: speakers } }, data: { bond: { increment: 1 } } }),
      ]);
    }
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
      if (usage) send(STREAM_USAGE_MARKER + JSON.stringify(usage));
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

  // Summarize old messages after the reply is out, never while the user waits.
  const { breakdown } = prompt;
  const historyRoom = settings.contextSize - settings.maxTokens - breakdown.system - breakdown.memory - breakdown.notes - 256;
  after(async () => {
    try {
      await foldHistory(sessionId, {
        budget: Math.max(500, Math.min(settings.contextBudget, historyRoom)),
        keepRecent: settings.keepRecent,
        ctx: parserCtx,
        persona,
      });
    } catch (error) {
      console.error("Summary failed; the next reply sends the full history instead", error);
    }
    // Every few exchanges, the characters who spoke remember what they learned about the user.
    if (settings.characterMemory) {
      try {
        await updateCharacterMemories(sessionId, { ctx: parserCtx, persona });
      } catch (error) {
        console.error("Character memory update failed", error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Message-Id": messageId,
      "X-User-Message-Id": userMessageId ?? "",
      "X-Prompt-Tokens": String(prompt.tokens),
      "X-Prompt-Breakdown": JSON.stringify(breakdown),
    },
  });
}
