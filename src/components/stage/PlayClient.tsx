"use client";

import { useState } from "react";
import { BackgroundLayer } from "./BackgroundLayer";
import { BacklogPanel } from "./BacklogPanel";
import { CharacterLayer } from "./CharacterLayer";
import { DevOverlay } from "./DevOverlay";
import { MenuPanel } from "./MenuPanel";
import { ReplyBar } from "./ReplyBar";
import { SavePanel } from "./SavePanel";
import { StageButton } from "./StageButton";
import { TextBox } from "./TextBox";
import { TopBar } from "./TopBar";
import { createPlayStore, PlayStoreProvider, usePlay, type PlayData } from "./usePlay";
import { usePlaybackEffects } from "./usePlaybackEffects";
import { VariantControls } from "./VariantControls";

function Stage() {
  usePlaybackEffects();
  const s = usePlay((state) => state);
  const beats = s.scene.stageBeats;
  const waiting = s.cursor >= beats.length && s.streaming;
  const beat = beats[Math.min(s.cursor, beats.length - 1)] ?? null;
  const stage = beat?.stage ?? s.scene.startStage;
  const shownBeat = waiting ? null : beat;
  const typedDone = !!beat && s.typed >= beat.text.length;
  const atEnd = s.cursor >= beats.length - 1;
  const inputOpen = !s.streaming && (beats.length === 0 || (atEnd && typedDone));
  const lastMessage = s.messages.at(-1);
  const onLatest = !!beat && beat.messageId === lastMessage?.id && lastMessage.role === "assistant";
  const bgUrl = s.backgrounds.find((b) => b.key === stage.backgroundKey)?.imageUrl ?? null;
  const speakerId = shownBeat?.kind === "dialogue" ? shownBeat.speakerId : null;

  return (
    <div
      className="stage relative h-dvh w-full select-none overflow-hidden bg-black"
      style={{ fontSize: `${16 * s.settings.uiScale}px` }}
      onClick={() => s.advance()}
    >
      <BackgroundLayer url={bgUrl} />
      <CharacterLayer stage={stage} characters={s.characters} session={s.session} speakerId={speakerId} />
      <TopBar />
      {s.settings.devMode && <DevOverlay />}

      <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        {s.error && (
          <div
            className="vn-box mx-auto mb-3 flex max-w-[52rem] items-center gap-3 px-4 py-2 text-sm text-danger"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex-1">{s.error}</span>
            {lastMessage?.role === "user" && (
              <StageButton onClick={() => void s.regenerate()}>Retry</StageButton>
            )}
            <button type="button" className="min-h-10 rounded-lg px-3 text-muted hover:text-ink" onClick={() => s.setError(null)}>
              Dismiss
            </button>
          </div>
        )}
        {(onLatest || waiting) && (
          <div className="mx-auto mb-7 flex max-w-[52rem] justify-end" onClick={(e) => e.stopPropagation()}>
            {onLatest && lastMessage && <VariantControls messageId={lastMessage.id} />}
          </div>
        )}
        {(beats.length > 0 || waiting) && (
          <TextBox
            beat={shownBeat}
            typed={s.typed}
            color={speakerId ? (s.characters[speakerId]?.color ?? null) : null}
            waiting={waiting}
            done={typedDone && !inputOpen}
          />
        )}
        {inputOpen && <ReplyBar userName={s.persona.name} />}
      </div>

      {s.panel === "log" && <BacklogPanel />}
      {s.panel === "saves" && <SavePanel />}
      {s.panel === "menu" && <MenuPanel />}
    </div>
  );
}

// The store is created once per mount. Later server refreshes are ignored: the store is the source of truth
// while playing, and loading a save reloads the page.
export function PlayClient({ data }: { data: PlayData }) {
  const [store] = useState(() => createPlayStore(data));
  return (
    <PlayStoreProvider value={store}>
      <Stage />
    </PlayStoreProvider>
  );
}
