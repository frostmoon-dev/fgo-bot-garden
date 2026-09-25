"use client";

import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import {
  deleteMessage as deleteMessageAction,
  editMessage as editMessageAction,
  setActiveVariant,
  setCast as setCastAction,
  updateSession,
} from "@/app/actions/sessions";
import { unwrap } from "@/lib/actionResult";
import type { MessageView, SessionView, SettingsView } from "@/lib/types";
import { buildScene, type Scene, type SceneData } from "./buildScene";
import { runChat } from "./chatStream";

export type Panel = null | "log" | "saves" | "menu";

export interface PlayData extends SceneData {
  settings: SettingsView;
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
  panel: Panel;
  error: string | null;
  promptTokens: number | null;

  advance: () => void;
  setTyped: (n: number) => void;
  send: (text: string) => Promise<void>;
  regenerate: () => Promise<void>;
  stop: () => void;
  swipe: (messageId: string, dir: -1 | 1) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  patchSession: (patch: Partial<Pick<SessionView, "title" | "mode" | "backgroundId">>) => void;
  setCast: (cast: SessionView["cast"]) => void;
  setSaves: (saves: SessionView["saves"]) => void;
  setPanel: (panel: Panel) => void;
  setAuto: (on: boolean) => void;
  setSkip: (on: boolean) => void;
  setError: (error: string | null) => void;
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

  // Streams lines into one variant of one message.
  const stream = async (
    body: { action: "reply" | "regenerate"; text?: string },
    target: (info: { messageId: string; userMessageId: string | null }) => { messageIndex: number },
  ) => {
    const abort = new AbortController();
    set({ streaming: true, abort, error: null });
    let messageIndex = -1;
    try {
      await runChat(
        { sessionId: get().session.id, ...body },
        {
          onStart: (info) => {
            set({ promptTokens: info.promptTokens });
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
    panel: null,
    error: null,
    promptTokens: null,

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
      const nextOrder = (before.at(-1)?.order ?? -1) + 1;
      const tempUser: MessageView | null = trimmed
        ? { id: "temp-user", order: nextOrder, role: "user", activeVariant: 0, variants: [{ id: "temp", content: trimmed }] }
        : null;
      const withUser = tempUser ? [...before, tempUser] : before;
      const scene = commit({ messages: withUser });
      set({ cursor: scene.stageBeats.length, typed: 0 });
      let started = false;
      try {
        await stream({ action: "reply", text: trimmed }, ({ messageId, userMessageId }) => {
          started = true;
          const msgs = get().messages.map((m) => (m.id === "temp-user" && userMessageId ? { ...m, id: userMessageId } : m));
          const assistant: MessageView = {
            id: messageId,
            order: (msgs.at(-1)?.order ?? -1) + 1,
            role: "assistant",
            activeVariant: 0,
            variants: [{ id: "pending", content: "" }],
          };
          commit({ messages: [...msgs, assistant] });
          return { messageIndex: msgs.length };
        });
        if (dropEmptyReply()) throw new Error("The AI returned an empty reply.");
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
          await stream({ action: "regenerate" }, ({ messageId }) => {
            const msgs = get().messages;
            commit({
              messages: [
                ...msgs,
                { id: messageId, order: last.order + 1, role: "assistant", activeVariant: 0, variants: [{ id: "pending", content: "" }] },
              ],
            });
            return { messageIndex: msgs.length };
          });
          if (dropEmptyReply()) throw new Error("The AI returned an empty reply.");
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
        await stream({ action: "regenerate" }, () => ({ messageIndex: index }));
        if (!get().messages[index].variants.at(-1)?.content.trim()) throw new Error("The AI returned an empty reply.");
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

    patchSession: (patch) => {
      const scene = commit({ session: { ...get().session, ...patch } });
      if (get().cursor >= scene.stageBeats.length) showEnd(scene);
      updateSession(get().session.id, patch).then(unwrap).catch(reportError);
    },

    setCast: (cast) => {
      commit({ session: { ...get().session, cast } });
      setCastAction(get().session.id, cast).then(unwrap).catch(reportError);
    },

    setSaves: (saves) => set({ session: { ...get().session, saves } }),

    setPanel: (panel) => set({ panel, auto: false, skip: false }),
    setAuto: (on) => set({ auto: on, skip: false }),
    setSkip: (on) => set({ skip: on, auto: false }),
    setError: (error) => set({ error }),
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
