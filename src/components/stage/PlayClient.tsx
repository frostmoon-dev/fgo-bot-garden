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
import { CastSuggestionCard, HelpPanel, PlaceCard, RecapCard, StageToast } from "./StageOverlays";
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
  // On a crowded phone screen only one character shows: the speaker, or during narration the last one who spoke.
  const onStage = (id: string | null) => !!id && Object.values(stage.slots).some((slot) => slot?.characterId === id);
  let focusId = onStage(speakerId) ? speakerId : null;
  for (let i = Math.min(s.cursor, beats.length - 1); !focusId && i >= 0; i--) {
    if (beats[i].kind === "dialogue" && onStage(beats[i].speakerId)) focusId = beats[i].speakerId;
  }

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
      style={{
        fontSize: `${16 * s.settings.uiScale}px`,
        ["--ui-scale" as string]: s.settings.uiScale,
        ["--window-alpha" as string]: s.settings.windowOpacity,
      }}
      onClick={() => (s.hideUi ? s.setHideUi(false) : s.advance())}
    >
      <div ref={sceneRef} className="absolute inset-0">
        <BackgroundLayer url={bgUrl} />
        <TimeTint time={time} layer="bg" />
        <CharacterLayer stage={stage} characters={s.characters} session={s.session} speakerId={speakerId} focusId={focusId} />
        <WeatherLayer kind={weather} />
        <TimeTint time={time} layer="all" />
      </div>
      <div ref={flashRef} aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-white opacity-0" />
      <div ref={fadeRef} aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-black opacity-0" />

      <PlaceCard />

      {!s.hideUi && (
        // One column, so the scene box at the top and the window, choices and errors at the bottom
        // can't overlap: when the bottom grows, it scrolls instead of sliding under the scene box.
        <div className="absolute inset-0 z-10 flex flex-col">
          <TopBar />
          <SceneBox />
          {s.settings.devMode && <DevOverlay />}
          <div className="min-h-4 flex-1" />

          <div className="min-h-0 shrink overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,calc(var(--fgo-text,1em)*1.7))] [scrollbar-width:none] sm:px-6 sm:pb-6">
            {s.error && (
              <div
                className="vn-box vn-lane mx-auto mb-3 flex max-w-[52rem] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm text-danger"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Provider errors can carry long JSON with no spaces: break anywhere, and scroll past a few lines,
                    so the buttons stay on screen. On a phone they wrap onto their own row. */}
                <span className="max-h-24 min-w-0 flex-1 basis-full overflow-y-auto [overflow-wrap:anywhere] sm:basis-0">{s.error}</span>
                <div className="ml-auto flex shrink-0 gap-2">
                  {lastMessage?.role === "user" && <StageButton onClick={() => void s.regenerate()}>Retry</StageButton>}
                  <button type="button" className="min-h-10 rounded-lg px-3 text-muted hover:text-ink" onClick={() => s.setError(null)}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {inputOpen && <ChoiceList />}
            {(onLatest || waiting) && !s.choices && (
              <div className="vn-lane mx-auto mb-7 flex max-w-[52rem] justify-end" onClick={(e) => e.stopPropagation()}>
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
                onLog={() => s.setPanel("log")}
              />
            )}
            {inputOpen && <ReplyBar userName={s.persona.name} />}
          </div>
        </div>
      )}

      {/* Notices at the top: the offer to add someone to the cast, with short toasts below it. */}
      <div className="pointer-events-none absolute inset-x-0 top-[4.25rem] z-40 flex flex-col items-center gap-2 px-4">
        {!s.hideUi && <CastSuggestionCard />}
        <StageToast />
      </div>
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
