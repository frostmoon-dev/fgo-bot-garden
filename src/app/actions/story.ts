"use server";

import type { ActionResult } from "@/lib/actionResult";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { completeChat } from "@/lib/llm/client";
import { aboutUser, choicesPrompt, choicesRequest, scenePrompt } from "@/lib/prompt/rules";
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
    let choices = parseChoices(await ask());
    if (!choices.length) choices = parseChoices(await ask());
    if (!choices.length) throw new Error("The model answered in character instead of giving choices. Try again.");
    return choices;
  });
}
