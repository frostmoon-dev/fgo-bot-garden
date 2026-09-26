"use client";

import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import {
  deleteMessage as deleteMessageAction,
  editMessage as editMessageAction,
  setActiveVariant,
  setCast as setCastAction,
  setPinned,
  switchAscension as switchAscensionAction,
  updateSession,
  type SessionPatch,
} from "@/app/actions/sessions";
import { refreshScene as refreshSceneAction, suggestChoices as suggestChoicesAction } from "@/app/actions/story";
import { unwrap } from "@/lib/actionResult";
import { bondLevel } from "@/lib/bond";
import type { Choice } from "@/lib/story/choices";
import type { MessageView, SessionView, SettingsView } from "@/lib/types";
import { buildScene, type Scene, type SceneData } from "./buildScene";
import { runChat, type PromptBreakdown } from "./chatStream";

export type Panel = null | "log" | "saves" | "menu" | "help" | "scene";

export interface PlayData extends SceneData {
  settings: SettingsView;
  // Bond points per character id.
  bonds: Record<string, number>;
}

export interface Toast {
  id: number;
  text: string;
}

interface PlayState extends PlayData {
  messages: MessageView[];
  scene: Scene;
  cursor: number;
  typed: number;
  streaming: boolean;
  abort: AbortController | null;
  auto: boolean;
  skip: boolean;
  hideUi: boolean;
  panel: Panel;
  error: string | null;
  toast: Toast | null;
  promptTokens: number | null;
  promptBreakdown: PromptBreakdown | null;
  sceneBusy: boolean;
  choices: Choice[] | null;
  choicesBusy: boolean;

  advance: () => void;
  setTyped: (n: number) => void;
  send: (text: string) => Promise<void>;
  regenerate: () => Promise<void>;
  stop: () => void;
  swipe: (messageId: string, dir: -1 | 1) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  togglePin: (messageId: string) => void;
  patchSession: (patch: SessionPatch) => void;
  setCast: (cast: SessionView["cast"]) => void;
  switchAscension: (characterId: string, spriteSetId: string | null) => Promise<void>;
  refreshScene: () => Promise<void>;
  suggestChoices: () => Promise<void>;
  clearChoices: () => void;
  setSaves: (saves: SessionView["saves"]) => void;
  setPanel: (panel: Panel) => void;
  setAuto: (on: boolean) => void;
  setSkip: (on: boolean) => void;
  setHideUi: (on: boolean) => void;
  setError: (error: string | null) => void;
  showToast: (text: string) => void;
}

// The whole history is re-parsed on every change, so only log each warning once.
const logged = new Set<string>();
function logWarnings(scene: Scene, devMode: boolean) {
  if (!devMode) return;
  for (const w of scene.warnings) {
    if (logged.has(w)) continue;
    logged.add(w);
    console.warn(`[parser] ${w}`);
  }
}

export type PlayStore = StoreApi<PlayState>;

// One store per play page, created with its data. Never shared between requests on the server.
export function createPlayStore(data: PlayData): PlayStore {
  return createStore<PlayState>()((set, get) => {
  // Rebuild beats after any change to messages or session.
  const commit = (patch: Partial<PlayState>) => {
    const s = { ...get(), ...patch };
    const scene = buildScene(s, s.messages);
    set({ ...patch, scene });
    return scene;
  };

  const showEnd = (scene: Scene) => {
    const last = scene.stageBeats.at(-1);
    set({ cursor: Math.max(0, scene.stageBeats.length - 1), typed: last?.text.length ?? 0 });
  };

  const firstBeatOf = (scene: Scene, messages: MessageView[], messageId: string) => {
    const idx = scene.stageBeats.findIndex((b) => b.messageId === messageId);
    if (idx >= 0) return idx;
    const pos = messages.findIndex((m) => m.id === messageId);
    const before = new Set(messages.slice(0, pos).map((m) => m.id));
    return scene.stageBeats.filter((b) => before.has(b.messageId)).length;
  };

  // Removes a trailing assistant placeholder that received no text. Returns true if it did.
  const dropEmptyReply = () => {
    const last = get().messages.at(-1);
    if (last?.role !== "assistant" || last.variants.length !== 1 || last.variants[0].content.trim()) return false;
    commit({ messages: get().messages.slice(0, -1) });
    return true;
  };

  const reportError = (e: unknown) => set({ error: e instanceof Error ? e.message : String(e) });

  const showToast = (text: string) => set({ toast: { id: Date.now(), text } });

  // After a reply: bond for everyone who spoke (the server counts the same), then the scene box and choices.
  const afterReply = (messageId: string, answered: boolean) => {
    const s = get();
    if (answered) {
      const speakers = [
        ...new Set(s.scene.beats.filter((b) => b.messageId === messageId && b.kind === "dialogue" && b.speakerId).map((b) => b.speakerId!)),
      ];
      const bonds = { ...s.bonds };
      for (const id of speakers) {
        const before = bondLevel(bonds[id] ?? 0);
        bonds[id] = (bonds[id] ?? 0) + 1;
        const after = bondLevel(bonds[id]);
        if (after > before) showToast(`♥ Bond with ${s.characters[id]?.name ?? "them"} is now Lv ${after}`);
      }
      set({ bonds });
    }
    void (async () => {
      if (get().settings.sceneTracker) await get().refreshScene();
      if (get().settings.autoChoices && !get().streaming) await get().suggestChoices();
    })();
  };

  // Streams lines into one variant of one message. Returns the message id.
  const stream = async (
    body: { action: "reply" | "regenerate"; text?: string },
    target: (info: { messageId: string; userMessageId: string | null }) => { messageIndex: number },
  ) => {
    const abort = new AbortController();
    set({ streaming: true, abort, error: null, choices: null });
    let messageIndex = -1;
    let messageId = "";
    try {
      await runChat(
        { sessionId: get().session.id, ...body },
        {
          onStart: (info) => {
            set({ promptTokens: info.promptTokens, promptBreakdown: info.breakdown });
            messageId = info.messageId;
            messageIndex = target(info).messageIndex;
          },
          onLine: (line) => {
            const messages = get().messages.map((m, i) => {
              if (i !== messageIndex) return m;
              const variants = m.variants.map((v, j) => (j === m.activeVariant ? { ...v, content: `${v.content}${line}\n` } : v));
              return { ...m, variants };
            });
            logWarnings(commit({ messages }), get().settings.devMode);
          },
        },
        abort.signal,
      );
    } finally {
      set({ streaming: false, abort: null, skip: false });
    }
    return messageId;
  };

  const scene = buildScene(data, data.session.messages);
  logWarnings(scene, data.settings.devMode);
  const lastBeat = scene.stageBeats.at(-1);

  return {
    ...data,
    messages: data.session.messages,
    scene,
    cursor: Math.max(0, scene.stageBeats.length - 1),
    typed: lastBeat?.text.length ?? 0,
    streaming: false,
    abort: null,
    auto: false,
    skip: false,
    hideUi: false,
    panel: null,
    error: null,
    toast: null,
    promptTokens: null,
    promptBreakdown: null,
    sceneBusy: false,
    choices: null,
    choicesBusy: false,

    advance: () => {
      const { scene, cursor, typed, streaming } = get();
      const beats = scene.stageBeats;
      if (cursor >= beats.length) return;
      if (typed < beats[cursor].text.length) return set({ typed: beats[cursor].text.length });
      if (cursor < beats.length - 1 || streaming) set({ cursor: cursor + 1, typed: 0 });
    },

    setTyped: (n) => set({ typed: n }),

    send: async (text) => {
      const s = get();
      if (s.streaming) return;
      const trimmed = text.trim();
      const before = s.messages;
      const startCursor = s.scene.stageBeats.length;
      const nextOrder = (before.at(-1)?.order ?? -1) + 1;
      const tempUser: MessageView | null = trimmed
        ? { id: "temp-user", order: nextOrder, role: "user", activeVariant: 0, pinned: false, variants: [{ id: "temp", content: trimmed }] }
        : null;
      const withUser = tempUser ? [...before, tempUser] : before;
      const scene = commit({ messages: withUser, choices: null });
      // Your own line shows on stage while the reply is written.
      set({ cursor: tempUser ? startCursor : scene.stageBeats.length, typed: 0 });
      let started = false;
      try {
        const messageId = await stream({ action: "reply", text: trimmed }, ({ messageId, userMessageId }) => {
          started = true;
          const msgs = get().messages.map((m) => (m.id === "temp-user" && userMessageId ? { ...m, id: userMessageId } : m));
          const assistant: MessageView = {
            id: messageId,
            order: (msgs.at(-1)?.order ?? -1) + 1,
            role: "assistant",
            activeVariant: 0,
            pinned: false,
            variants: [{ id: "pending", content: "" }],
          };
          commit({ messages: [...msgs, assistant] });
          return { messageIndex: msgs.length };
        });
        if (dropEmptyReply()) throw new Error("The AI returned an empty reply.");
        afterReply(messageId, !!trimmed);
      } catch (e) {
        // Before the stream starts the server keeps nothing, so go back to the old history.
        if (!started) commit({ messages: before });
        else dropEmptyReply();
        if (get().cursor >= get().scene.stageBeats.length) showEnd(get().scene);
        reportError(e);
      }
    },

    regenerate: async () => {
      const s = get();
      if (s.streaming) return;
      const index = s.messages.length - 1;
      const last = s.messages[index];
      if (!last) return;
      if (last.role === "user") {
        // No reply yet: generate one.
        set({ cursor: s.scene.stageBeats.length, typed: 0 });
        try {
          const messageId = await stream({ action: "regenerate" }, ({ messageId }) => {
            const msgs = get().messages;
            commit({
              messages: [
                ...msgs,
                { id: messageId, order: last.order + 1, role: "assistant", activeVariant: 0, pinned: false, variants: [{ id: "pending", content: "" }] },
              ],
            });
            return { messageIndex: msgs.length };
          });
          if (dropEmptyReply()) throw new Error("The AI returned an empty reply.");
          afterReply(messageId, false);
        } catch (e) {
          dropEmptyReply();
          showEnd(get().scene);
          reportError(e);
        }
        return;
      }
      const previous = last;
      const withVariant: MessageView = {
        ...last,
        activeVariant: last.variants.length,
        variants: [...last.variants, { id: "pending", content: "" }],
      };
      const messages = [...s.messages.slice(0, index), withVariant];
      const scene = commit({ messages });
      set({ cursor: firstBeatOf(scene, messages, last.id), typed: 0 });
      try {
        const messageId = await stream({ action: "regenerate" }, () => ({ messageIndex: index }));
        if (!get().messages[index].variants.at(-1)?.content.trim()) throw new Error("The AI returned an empty reply.");
        afterReply(messageId, false);
      } catch (e) {
        const now = get().messages[index];
        if (!now.variants.at(-1)?.content.trim()) {
          showEnd(commit({ messages: [...get().messages.slice(0, index), previous] }));
        } else if (get().cursor >= get().scene.stageBeats.length) {
          showEnd(get().scene);
        }
        reportError(e);
      }
    },

    stop: () => get().abort?.abort(),

    swipe: (messageId, dir) => {
      const s = get();
      if (s.streaming) return;
      const message = s.messages.find((m) => m.id === messageId);
      if (!message) return;
      const next = message.activeVariant + dir;
      if (next < 0 || next >= message.variants.length) return;
      const messages = s.messages.map((m) => (m.id === messageId ? { ...m, activeVariant: next } : m));
      const scene = commit({ messages });
      set({ cursor: firstBeatOf(scene, messages, messageId), typed: 0 });
      setActiveVariant(messageId, next).then(unwrap).catch(reportError);
    },

    editMessage: (messageId, content) => {
      const messages = get().messages.map((m) =>
        m.id === messageId
          ? { ...m, variants: m.variants.map((v, i) => (i === m.activeVariant ? { ...v, content } : v)) }
          : m,
      );
      const scene = commit({ messages });
      if (get().cursor >= scene.stageBeats.length) showEnd(scene);
      editMessageAction(messageId, content).then(unwrap).catch(reportError);
    },

    deleteMessage: (messageId) => {
      const scene = commit({ messages: get().messages.filter((m) => m.id !== messageId) });
      if (get().cursor >= scene.stageBeats.length) showEnd(scene);
      deleteMessageAction(messageId).then(unwrap).catch(reportError);
    },

    togglePin: (messageId) => {
      const message = get().messages.find((m) => m.id === messageId);
      if (!message) return;
      const pinned = !message.pinned;
      set({ messages: get().messages.map((m) => (m.id === messageId ? { ...m, pinned } : m)) });
      showToast(pinned ? "Pinned: this moment stays in the AI's memory." : "Unpinned.");
      setPinned(messageId, pinned).then(unwrap).catch(reportError);
    },

    patchSession: (patch) => {
      const scene = commit({ session: { ...get().session, ...patch } });
      if (get().cursor >= scene.stageBeats.length) showEnd(scene);
      updateSession(get().session.id, patch).then(unwrap).catch(reportError);
    },

    setCast: (cast) => {
      commit({ session: { ...get().session, cast } });
      setCastAction(get().session.id, cast)
        .then(unwrap)
        .then((scene) => commit({ session: { ...get().session, scene } }))
        .catch(reportError);
    },

    switchAscension: async (characterId, spriteSetId) => {
      const s = get();
      if (s.streaming) return;
      const cast = s.session.cast.map((c) => (c.characterId === characterId ? { ...c, spriteSetId } : c));
      commit({ session: { ...s.session, cast } });
      try {
        const result = unwrap(await switchAscensionAction(s.session.id, characterId, spriteSetId));
        const now = get();
        const session = result.scene !== null ? { ...now.session, scene: result.scene } : now.session;
        const formName = now.characters[characterId]?.spriteSets.find((x) => x.id === spriteSetId)?.name ?? "the default ascension";
        if (result.formChange) {
          // Mid-story: the "changes form" line joins the story and plays now.
          const change = result.formChange;
          const exists = now.messages.some((m) => m.id === change.id);
          const messages = exists ? now.messages.map((m) => (m.id === change.id ? change : m)) : [...now.messages, change];
          const scene = commit({ messages, session });
          const at = scene.stageBeats.findIndex((b) => b.messageId === change.id);
          if (at >= 0) set({ cursor: at, typed: 0 });
          showToast(`${now.characters[characterId]?.name ?? "They"} will notice the change in the next reply.`);
          return;
        }
        if (!result.firstMessage) return void set({ session });
        const first = result.firstMessage;
        const exists = now.messages.some((m) => m.id === first.id);
        const messages = exists ? now.messages.map((m) => (m.id === first.id ? first : m)) : [first, ...now.messages];
        const scene = commit({ messages, session });
        // A story that has not started replays the new greeting from the top.
        if (!messages.some((m) => m.role === "user")) set({ cursor: 0, typed: 0 });
        else if (get().cursor >= scene.stageBeats.length) showEnd(scene);
        showToast(`Greeting switched to ${formName}.`);
      } catch (e) {
        reportError(e);
      }
    },

    refreshScene: async () => {
      if (get().sceneBusy) return;
      set({ sceneBusy: true });
      try {
        const scene = unwrap(await refreshSceneAction(get().session.id));
        set({ session: { ...get().session, scene } });
      } catch (e) {
        console.warn("Scene box not updated:", e);
      } finally {
        set({ sceneBusy: false });
      }
    },

    suggestChoices: async () => {
      if (get().choicesBusy || get().streaming) return;
      set({ choicesBusy: true });
      try {
        set({ choices: unwrap(await suggestChoicesAction(get().session.id)) });
      } catch (e) {
        reportError(e);
      } finally {
        set({ choicesBusy: false });
      }
    },

    clearChoices: () => set({ choices: null }),

    setSaves: (saves) => set({ session: { ...get().session, saves } }),

    setPanel: (panel) => set({ panel, auto: false, skip: false }),
    setAuto: (on) => set({ auto: on, skip: false }),
    setSkip: (on) => set({ skip: on, auto: false }),
    setHideUi: (on) => set({ hideUi: on, auto: false, skip: false }),
    setError: (error) => set({ error }),
    showToast,
  };
});
}

const PlayStoreContext = createContext<PlayStore | null>(null);
export const PlayStoreProvider = PlayStoreContext.Provider;

export function usePlayApi(): PlayStore {
  const store = useContext(PlayStoreContext);
  if (!store) throw new Error("usePlay must be used inside PlayStoreProvider");
  return store;
}

export function usePlay<T>(selector: (state: PlayState) => T): T {
  return useStore(usePlayApi(), selector);
}
