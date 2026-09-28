"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/actionResult";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getPersona } from "@/lib/data/queries";
import { completeChat } from "@/lib/llm/client";
import { aboutUser, choicesPrompt, choicesRequest, scenePrompt, sceneWriterPrompt } from "@/lib/prompt/rules";
import { safe } from "@/lib/safeAction";
import { cleanScene } from "@/lib/scene";
import { loadStoryContext } from "@/lib/story/context";
import { parseChoices, type Choice } from "@/lib/story/choices";

// Small extra requests that keep the world around the story alive. Each costs one short model call.

// Updates the scene box from the latest events.
export async function refreshScene(sessionId: string): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const { session, persona, transcript, absent } = await loadStoryContext(sessionId, 4);
    if (!transcript.trim()) return session.scene;
    const text = await completeChat({
      messages: [
        { role: "system", content: scenePrompt(persona.name) },
        {
          role: "user",
          content: `${aboutUser(persona, 400)}${absent.length ? `\n\nNo longer in the story (never list them under Present): ${absent.join(", ")}.` : ""}\n\nCurrent scene:\n${session.scene || "(not set yet)"}\n\nLatest events:\n${transcript}`,
        },
      ],
      temperature: 0.2,
      maxTokens: 220,
    });
    const scene = cleanScene(text);
    if (!scene) throw new Error("The scene could not be updated: the model sent back no scene lines.");
    await db.session.update({ where: { id: sessionId }, data: { scene } });
    return scene;
  });
}

// Three VN-style choices for the user's next move.
export async function suggestChoices(sessionId: string): Promise<ActionResult<Choice[]>> {
  return safe(async () => {
    await requireAuth();
    const { session, persona, transcript, absent } = await loadStoryContext(sessionId, 10);
    // Who the user is and what the story remembers, so the choices sound like them and fit the story.
    const cast = session.cast.map((c) => c.character.name).join(", ");
    const context = [
      aboutUser(persona),
      cast && `Characters in this story: ${cast}.`,
      absent.length > 0 && `No longer in the story (never suggest talking to or about them as if present): ${absent.join(", ")}.`,
      session.premise.trim() && `How the story began:\n${session.premise.trim()}`,
      session.memory.trim() && `Story notes (always true):\n${session.memory.trim()}`,
      session.summary.trim() && `Earlier in the story:\n${session.summary.trim()}`,
      session.scene && `Scene now:\n${session.scene}`,
      `Latest lines (latest last):\n${transcript || "(the story is about to begin)"}`,
      choicesRequest(persona.name),
    ]
      .filter(Boolean)
      .join("\n\n");
    const ask = () =>
      completeChat({
        messages: [
          { role: "system", content: choicesPrompt(persona.name) },
          { role: "user", content: context },
        ],
        temperature: 0.9,
        maxTokens: 220,
      });
    // Roleplay models sometimes answer in character instead; one quiet retry usually fixes it.
    let reply = await ask();
    let choices = parseChoices(reply);
    if (!choices.length) {
      reply = await ask();
      choices = parseChoices(reply);
    }
    if (!choices.length) {
      // Say what came back, so it's clear whether the model roleplayed, explained itself or sent nothing.
      const said = reply.replace(/\s+/g, " ").trim();
      throw new Error(
        said
          ? `The model didn't give choices in the SAY:/DO: format. It wrote: “${said.length > 120 ? `${said.slice(0, 120)}…` : said}”`
          : "The model sent back nothing (reasoning models sometimes spend the whole reply thinking). Try again, or try another model.",
      );
    }
    return choices;
  });
}

// Very long drafts are cut, not rejected: the model only needs the gist to finish them.
const MAX_DRAFT = 4000;

// "Write a scene": finishes the player's draft of an opening scene. The draft itself is never saved here.
export async function completeScene(input: { text: string; characterIds: string[] }): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const { text, characterIds } = z
      .object({ text: z.string().max(20000), characterIds: z.array(z.string()).max(12) })
      .parse(input);
    const [persona, characters] = await Promise.all([
      getPersona(),
      db.character.findMany({ where: { id: { in: characterIds } }, select: { name: true, description: true } }),
    ]);
    const cast = characters
      .map((c) => {
        const about = c.description.replace(/\s+/g, " ").trim();
        return `- ${c.name}${about ? `: ${about.length > 300 ? `${about.slice(0, 300)}…` : about}` : ""}`;
      })
      .join("\n");
    const draft = text.trim().slice(0, MAX_DRAFT);
    const reply = await completeChat({
      messages: [
        { role: "system", content: sceneWriterPrompt(persona.name) },
        {
          role: "user",
          content: [
            aboutUser(persona, 400),
            `Characters in the scene:\n${cast || "(none chosen yet: keep to the ones the draft names)"}`,
            `Draft:\n${draft || "(empty: invent a quiet opening scene for these characters)"}`,
            "---\nWrite the finished scene now. Only the scene.",
          ].join("\n\n"),
        },
      ],
      temperature: 0.8,
      maxTokens: 400,
    });
    const scene = reply
      .replace(/^\s*(#+\s*|\*\*)?(scene|finished scene)\s*:?\**\s*$/gim, "")
      .replace(/\*\*|__/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!scene) throw new Error("The model sent back nothing. Try again, or try another model.");
    return scene;
  });
}
