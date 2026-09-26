import "server-only";
import { db } from "@/lib/db";
import { getPersona, listBackgrounds } from "@/lib/data/queries";
import { userAliases } from "@/lib/parser/scriptParser";
import { toTranscript } from "@/lib/parser/transcript";
import type { Mode, ParserContext } from "@/lib/parser/types";
import { userTextForPrompt } from "@/lib/userInput";

// The recent part of a story, as plain lines, for the small helper requests (scene box, choices).
export async function loadStoryContext(sessionId: string, lastMessages: number) {
  const [session, persona, backgrounds] = await Promise.all([
    db.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        cast: { include: { character: { select: { id: true, name: true, aliases: true, expressions: { select: { key: true } } } } } },
        messages: {
          orderBy: [{ order: "desc" }, { createdAt: "desc" }],
          take: lastMessages,
          select: { role: true, activeVariant: true, variants: { orderBy: { position: "asc" }, select: { content: true } } },
        },
      },
    }),
    getPersona(),
    listBackgrounds(),
  ]);
  const ctx: ParserContext = {
    characters: session.cast.map(({ character: c }) => ({
      id: c.id,
      name: c.name,
      aliases: c.aliases,
      expressions: c.expressions.map((e) => e.key),
    })),
    backgrounds: backgrounds.map((b) => b.key),
    mode: session.mode as Mode,
    mainCharacterId: session.mainCharacterId,
    userName: persona.name,
    userAliases: userAliases(persona.addressAs),
  };
  const transcript = [...session.messages]
    .reverse()
    .map((m) => {
      const content = (m.variants[m.activeVariant] ?? m.variants.at(-1))?.content ?? "";
      return m.role === "user" ? `${persona.name}: ${userTextForPrompt(content)}` : toTranscript(content, ctx);
    })
    .filter(Boolean)
    .join("\n");
  return { session, persona, ctx, transcript };
}
