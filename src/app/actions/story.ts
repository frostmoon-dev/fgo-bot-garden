"use server";

import type { ActionResult } from "@/lib/actionResult";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { completeChat } from "@/lib/llm/client";
import { choicesPrompt, scenePrompt } from "@/lib/prompt/rules";
import { safe } from "@/lib/safeAction";
import { cleanScene } from "@/lib/scene";
import { loadStoryContext } from "@/lib/story/context";
import { parseChoices, type Choice } from "@/lib/story/choices";

// Small extra requests that keep the world around the story alive. Each costs one short model call.

// Updates the scene box from the latest events.
export async function refreshScene(sessionId: string): Promise<ActionResult<string>> {
  return safe(async () => {
    await requireAuth();
    const { session, persona, transcript } = await loadStoryContext(sessionId, 4);
    if (!transcript.trim()) return session.scene;
    const text = await completeChat({
      messages: [
        { role: "system", content: scenePrompt(persona.name) },
        { role: "user", content: `Current scene:\n${session.scene || "(not set yet)"}\n\nLatest events:\n${transcript}` },
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
    const { session, persona, transcript } = await loadStoryContext(sessionId, 6);
    const text = await completeChat({
      messages: [
        { role: "system", content: choicesPrompt(persona.name) },
        {
          role: "user",
          content: `${session.scene ? `Scene:\n${session.scene}\n\n` : ""}Story so far (latest last):\n${transcript || "(the story is about to begin)"}`,
        },
      ],
      temperature: 0.9,
      maxTokens: 200,
    });
    const choices = parseChoices(text);
    if (!choices.length) throw new Error("No choices came back. Try again.");
    return choices;
  });
}
