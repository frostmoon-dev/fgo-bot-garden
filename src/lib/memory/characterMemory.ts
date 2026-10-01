import "server-only";
import { db } from "@/lib/db";
import { completeChat } from "@/lib/llm/client";
import { ScriptParser } from "@/lib/parser/scriptParser";
import { toTranscript } from "@/lib/parser/transcript";
import type { ParserContext } from "@/lib/parser/types";
import { aboutUser, characterMemoryPrompt, type PersonaInfo } from "@/lib/prompt/rules";
import { userTextForPrompt } from "@/lib/userInput";

// Messages gathered before the characters' memories are updated: about six exchanges.
export const MEMORY_EVERY = 12;
// The newest exchange can still be regenerated or swiped, so it waits for the next round.
const SETTLING = 2;

// Folds the latest part of a story into the memory of every character who spoke in it, so they remember
// the user in later stories. Runs after a reply is sent; one small request per character who spoke.
export async function updateCharacterMemories(
  sessionId: string,
  opts: { ctx: ParserContext; persona: PersonaInfo },
): Promise<void> {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      rememberedUntil: true,
      messages: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { order: true, role: true, activeVariant: true, variants: { orderBy: { position: "asc" }, select: { content: true } } },
      },
    },
  });
  if (!session) return;
  const fresh = session.messages.filter((m) => m.order > session.rememberedUntil).slice(0, -SETTLING);
  if (fresh.length < MEMORY_EVERY) return;

  // Claim these messages first, so two replies finishing together don't remember them twice.
  const until = fresh.at(-1)!.order;
  const claim = await db.session.updateMany({
    where: { id: sessionId, rememberedUntil: session.rememberedUntil },
    data: { rememberedUntil: until },
  });
  if (claim.count === 0) return;

  const raw = (m: (typeof fresh)[number]) => (m.variants[m.activeVariant] ?? m.variants.at(-1))?.content ?? "";
  const parser = new ScriptParser(opts.ctx);
  const speakers = new Set<string>();
  const transcript = fresh
    .map((m) => {
      if (m.role === "user") return `${opts.persona.name}: ${userTextForPrompt(raw(m))}`;
      for (const line of parser.parseText(raw(m))) if (line.type === "dialogue" && line.characterId) speakers.add(line.characterId);
      return toTranscript(raw(m), opts.ctx);
    })
    .filter(Boolean)
    .join("\n");
  if (!speakers.size) return;

  const characters = await db.character.findMany({
    where: { id: { in: [...speakers] } },
    select: { id: true, name: true, memories: true },
  });
  await Promise.all(
    characters.map(async (c) => {
      const text = await completeChat({
        messages: [
          { role: "system", content: characterMemoryPrompt(c.name, opts.persona.name) },
          {
            role: "user",
            content: `${aboutUser(opts.persona, 600)}\n\n${c.name}'s memory so far:\n${c.memories.trim() || "(nothing yet)"}\n\nNew events:\n${transcript}`,
          },
        ],
        temperature: 0.3,
        maxTokens: 350,
        purpose: "memory",
      });
      const memories = text.trim();
      // An empty or runaway answer keeps the old memory rather than replacing it.
      if (!memories || memories.length > 3000) return;
      await db.character.update({ where: { id: c.id }, data: { memories } });
    }),
  );
}
