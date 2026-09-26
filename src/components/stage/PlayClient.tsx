"use client";

import { useEffect, useRef, useState } from "react";
import { parseScene, timeOfDay, weatherOf } from "@/lib/scene";
import { TimeTint, WeatherLayer } from "./Ambience";
import { BackgroundLayer } from "./BackgroundLayer";
import { BacklogPanel } from "./BacklogPanel";
import { CharacterLayer } from "./CharacterLayer";
import { ChoiceList } from "./ChoiceList";
import { DevOverlay } from "./DevOverlay";
import { MenuPanel } from "./MenuPanel";
import { ReplyBar } from "./ReplyBar";
import { SavePanel } from "./SavePanel";
import { SceneBox } from "./SceneBox";
import { ScenePanel } from "./ScenePanel";
import { StageButton } from "./StageButton";
import { HelpPanel, PlaceCard, RecapCard, StageToast } from "./StageOverlays";
import { TextBox } from "./TextBox";
import { TopBar } from "./TopBar";
import { createPlayStore, PlayStoreProvider, usePlay, type PlayData } from "./usePlay";
import { usePlaybackEffects } from "./usePlaybackEffects";
import { VariantControls } from "./VariantControls";

const EFFECTS: Record<string, { target: "scene" | "flash" | "fade"; frames: Keyframe[]; duration: number }> = {
  shake: {
    target: "scene",
    frames: [0, -1.2, 1.2, -0.8, 0.8, -0.3, 0].map((x) => ({ translate: `${x}% 0` })),
    duration: 450,
  },
  flash: { target: "flash", frames: [{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], duration: 500 },
  fade: { target: "fade", frames: [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], duration: 1600 },
};

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
  const pending = !!shownBeat && shownBeat.role === "user" && atEnd && s.streaming;

  const world = parseScene(s.session.scene);
  const time = timeOfDay(world.Time);
  const weather = weatherOf(world.Weather);

  // Screen effects the AI asked for with {effect:…}, played when their line comes up.
  const sceneRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const effect = shownBeat?.effect;
  const effectKey = shownBeat?.key;
  useEffect(() => {
    if (!effect || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fx = EFFECTS[effect];
    const el = { scene: sceneRef, flash: flashRef, fade: fadeRef }[fx.target].current;
    el?.animate(fx.frames, { duration: fx.duration, easing: "ease-out" });
  }, [effect, effectKey]);

  return (
    <div
      className="stage relative h-dvh w-full select-none overflow-hidden bg-black"
      style={{ fontSize: `${16 * s.settings.uiScale}px` }}
      onClick={() => (s.hideUi ? s.setHideUi(false) : s.advance())}
    >
      <div ref={sceneRef} className="absolute inset-0">
        <BackgroundLayer url={bgUrl} />
        <TimeTint time={time} layer="bg" />
        <CharacterLayer stage={stage} characters={s.characters} session={s.session} speakerId={speakerId} />
        <WeatherLayer kind={weather} />
        <TimeTint time={time} layer="all" />
      </div>
      <div ref={flashRef} aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-white opacity-0" />
      <div ref={fadeRef} aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-black opacity-0" />

      <PlaceCard />

      {!s.hideUi && (
        <>
          <TopBar />
          <SceneBox />
          {s.settings.devMode && <DevOverlay />}

          <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
            {s.error && (
              <div
                className="vn-box mx-auto mb-3 flex max-w-[52rem] items-center gap-3 px-4 py-2 text-sm text-danger"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="flex-1">{s.error}</span>
                {lastMessage?.role === "user" && <StageButton onClick={() => void s.regenerate()}>Retry</StageButton>}
                <button type="button" className="min-h-10 rounded-lg px-3 text-muted hover:text-ink" onClick={() => s.setError(null)}>
                  Dismiss
                </button>
              </div>
            )}
            {inputOpen && <ChoiceList />}
            {(onLatest || waiting) && !s.choices && (
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
                pending={pending}
                done={typedDone && !inputOpen}
              />
            )}
            {inputOpen && <ReplyBar userName={s.persona.name} />}
          </div>
        </>
      )}

      <StageToast />
      <RecapCard />
      {s.panel === "log" && <BacklogPanel />}
      {s.panel === "saves" && <SavePanel />}
      {s.panel === "menu" && <MenuPanel />}
      {s.panel === "help" && <HelpPanel />}
      {s.panel === "scene" && <ScenePanel />}
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
