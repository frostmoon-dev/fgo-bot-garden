"use client";

import { useEffect, useRef, useState } from "react";
import type { Effect } from "@/lib/parser/types";
import { pickAscension } from "@/lib/ascension";
import { characterTheme, musicFor } from "@/lib/music/library";
import { paintedTime, parseScene, timeOfDay, weatherOf } from "@/lib/scene";
import { TimeTint, WeatherLayer } from "./Ambience";
import { BackgroundLayer } from "./BackgroundLayer";
import { BacklogPanel } from "./BacklogPanel";
import { CharacterLayer } from "./CharacterLayer";
import { ChoiceList } from "./ChoiceList";
import { DevOverlay } from "./DevOverlay";
import { MenuPanel } from "./MenuPanel";
import { MusicPlayer } from "./MusicPlayer";
import { narrationSubject } from "./subject";
import { ReplyBar } from "./ReplyBar";
import { SavePanel } from "./SavePanel";
import { SceneBox } from "./SceneBox";
import { NextScenePanel } from "./NextScenePanel";
import { ScenePanel } from "./ScenePanel";
import { StageButton } from "./StageButton";
import { CastSuggestionCard, HelpPanel, PlaceCard, RecapCard, StageToast } from "./StageOverlays";
import { TextBox } from "./TextBox";
import { TopBar } from "./TopBar";
import { createPlayStore, PlayStoreProvider, usePlay, usePlayApi, type PlayData } from "./usePlay";
import { usePlaybackEffects } from "./usePlaybackEffects";
import { VariantControls } from "./VariantControls";

// Short and subtle, and all of them off under prefers-reduced-motion.
const EFFECTS: Record<Effect, { target: "scene" | "flash" | "fade" | "hit"; frames: Keyframe[]; duration: number }> = {
  shake: {
    target: "scene",
    frames: [0, -1.2, 1.2, -0.8, 0.8, -0.3, 0].map((x) => ({ translate: `${x}% 0` })),
    duration: 450,
  },
  flash: { target: "flash", frames: [{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], duration: 500 },
  fade: { target: "fade", frames: [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], duration: 1600 },
  // Pain, a blow, sudden anger: a red pulse with a small jolt.
  hit: { target: "hit", frames: [{ opacity: 0 }, { opacity: 0.45, offset: 0.15 }, { opacity: 0 }], duration: 600 },
  // Something ominous: the room dims for a moment, without ending the scene as fade does.
  // Only the scene darkens, so the line about it stays readable.
  dark: {
    target: "scene",
    frames: [{ filter: "brightness(1)" }, { filter: "brightness(0.45)", offset: 0.3 }, { filter: "brightness(0.45)", offset: 0.7 }, { filter: "brightness(1)" }],
    duration: 2200,
  },
  // A dramatic beat: the camera pushes in a little, then eases back.
  zoom: { target: "scene", frames: [{ scale: 1 }, { scale: 1.06, offset: 0.35 }, { scale: 1.06, offset: 0.75 }, { scale: 1 }], duration: 1800 },
  // Dizzy, dazed, about to faint.
  dizzy: {
    target: "scene",
    frames: [
      { filter: "blur(0)", rotate: "0deg" },
      { filter: "blur(4px)", rotate: "-0.6deg", offset: 0.3 },
      { filter: "blur(2px)", rotate: "0.6deg", offset: 0.6 },
      { filter: "blur(0)", rotate: "0deg" },
    ],
    duration: 1500,
  },
  // A dream, a memory, a fairy's illusion: a soft bright haze.
  dream: {
    target: "scene",
    frames: [
      { filter: "blur(0) brightness(1) saturate(1)" },
      { filter: "blur(3px) brightness(1.25) saturate(0.7)", offset: 0.4 },
      { filter: "blur(0) brightness(1) saturate(1)" },
    ],
    duration: 2000,
  },
  // Digital interference: BB's screens, a broken signal.
  glitch: {
    target: "scene",
    frames: [
      { translate: "0 0", filter: "none" },
      { translate: "-1.5% 0", filter: "hue-rotate(70deg) contrast(1.4)", offset: 0.15 },
      { translate: "1% 0", filter: "none", offset: 0.3 },
      { translate: "-0.5% 0", filter: "hue-rotate(-50deg) saturate(1.6)", offset: 0.5 },
      { translate: "0 0", filter: "none", offset: 0.65 },
      { translate: "0 0", filter: "none" },
    ],
    duration: 600,
  },
  // Surprise or comic shock: the scene hops once.
  jump: { target: "scene", frames: [0, -2, 0, -0.6, 0].map((y) => ({ translate: `0 ${y}%` })), duration: 420 },
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
  // A character's signature theme, in the ascension they are in at this line.
  const themeOf = (id: string) => {
    const c = s.characters[id];
    if (!c) return null;
    const formId = stage.forms?.[id] ?? s.session.cast.find((x) => x.characterId === id)?.spriteSetId;
    return characterTheme(c.name, pickAscension(c, formId)?.name);
  };
  // Music follows the atmosphere: the AI's {music:…} cue, else the scene box's mood (see lib/music).
  const musicUrl = s.musicMuted
    ? null
    : musicFor({
        storyId: s.session.id,
        cue: stage.music,
        scene: s.settings.sceneTracker ? parseScene(s.session.scene) : null,
        backgroundMusic: s.backgrounds.find((b) => b.key === stage.backgroundKey)?.musicUrl || null,
        mainTheme: themeOf(s.session.mainCharacterId),
        themeOf,
      });
  const speakerId = shownBeat?.kind === "dialogue" ? shownBeat.speakerId : null;
  const pending = !!shownBeat && shownBeat.role === "user" && atEnd && s.streaming;
  // On a crowded phone screen only one character shows: the speaker, or during narration the last one who spoke.
  const onStage = (id: string | null) => !!id && Object.values(stage.slots).some((slot) => slot?.characterId === id);
  // Narration about someone on stage ("BB giggles…", or their thought) brings them to the front for that line.
  const present = Object.values(stage.slots).flatMap((slot) => (slot && s.characters[slot.characterId] ? [s.characters[slot.characterId]] : []));
  const subjectId =
    !speakerId && shownBeat?.kind === "narration"
      ? onStage(shownBeat.thinker?.id ?? null)
        ? shownBeat.thinker!.id
        : narrationSubject(shownBeat.text, present)
      : null;
  let focusId = onStage(speakerId) ? speakerId : subjectId;
  for (let i = Math.min(s.cursor, beats.length - 1); !focusId && i >= 0; i--) {
    if (beats[i].kind === "dialogue" && onStage(beats[i].speakerId)) focusId = beats[i].speakerId;
  }
  // Whoever was active before the focus (spoke, or the narration was about them): with three on stage,
  // the focus and this partner are the two shown.
  const activeIn = (b: (typeof beats)[number]) =>
    b.kind === "dialogue" ? b.speakerId : b.kind === "narration" ? (b.thinker?.id ?? narrationSubject(b.text, present)) : null;
  let partnerId: string | null = null;
  // The last 60 lines are plenty; the stage redraws on every typed letter, so it doesn't read the whole story.
  for (let i = Math.min(s.cursor, beats.length - 1), stop = i - 60; !partnerId && i >= 0 && i > stop; i--) {
    const id = activeIn(beats[i]);
    if (id && id !== focusId && onStage(id)) partnerId = id;
  }

  // A story from "Write a scene" has no greeting: its first reply opens it, as soon as the stage is up.
  const api = usePlayApi();
  const begun = useRef(false);
  useEffect(() => {
    const { messages, session, send } = api.getState();
    if (begun.current || messages.length > 0 || !session.premise.trim()) return;
    begun.current = true;
    void send("");
  }, [api]);

  // iPhones lay the keyboard over the page instead of shrinking it. While typing, the stage takes the
  // height that is left, so the reply box sits right above the keyboard. (Android shrinks the page itself.)
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    const el = stageRef.current;
    if (!vv || !el) return;
    const fit = () => {
      const typing = document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement;
      if (typing && vv.height < window.innerHeight - 80) {
        el.style.height = `${vv.height}px`;
        window.scrollTo(0, 0);
      } else {
        el.style.height = "";
      }
    };
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, []);

  const world = parseScene(s.session.scene);
  const time = timeOfDay(world.Time);
  const weather = weatherOf(world.Weather);

  // Screen effects the AI asked for with {effect:…}, played when their line comes up.
  const sceneRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const effect = shownBeat?.effect;
  const effectKey = shownBeat?.key;
  useEffect(() => {
    if (!effect || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fx = EFFECTS[effect];
    const el = { scene: sceneRef, flash: flashRef, fade: fadeRef, hit: hitRef }[fx.target].current;
    el?.animate(fx.frames, { duration: fx.duration, easing: "ease-out" });
    // A hit also jolts the scene a little.
    if (effect === "hit") sceneRef.current?.animate([0, 0.8, -0.6, 0.2, 0].map((x) => ({ translate: `${x}% 0` })), { duration: 300, easing: "ease-out" });
  }, [effect, effectKey]);

  return (
    // With FGO frames the frame letterboxes the stage to 16:9, as in the game (see .vn-frame).
    <div className="vn-frame">
    <div
      ref={stageRef}
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
        {/* A background painted at night or sunset already shows its time: only the light overall tint applies. */}
        <TimeTint time={paintedTime(stage.backgroundKey) ? null : time} layer="bg" />
        <CharacterLayer stage={stage} characters={s.characters} session={s.session} speakerId={speakerId} focusId={focusId} subjectId={subjectId} partnerId={partnerId} />
        <WeatherLayer kind={weather} />
        <TimeTint time={time} layer="all" />
      </div>
      <div ref={flashRef} aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-white opacity-0" />
      <div ref={fadeRef} aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-black opacity-0" />
      <div ref={hitRef} aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-danger opacity-0" />

      <PlaceCard />
      <MusicPlayer url={musicUrl} volume={s.settings.musicVolume} />

      {!s.hideUi && (
        // One column, so the scene box at the top and the window, choices and errors at the bottom
        // can't overlap: when the bottom grows, it scrolls instead of sliding under the scene box.
        <div className="absolute inset-0 z-10 flex flex-col">
          <TopBar />
          <SceneBox />
          {s.settings.devMode && <DevOverlay />}
          <div className="min-h-4 flex-1" />

          <div className="min-h-0 shrink overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,calc(var(--fgo-text,1em)*1.7))] [scrollbar-width:none] sm:px-6 sm:pb-6">
            <CastSuggestionCard className="vn-lane mx-auto mb-3 max-w-[52rem]" />
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
              // Clear of the name tab, which rises above the window by about 1.5 lines of story text.
              <div className="vn-lane mx-auto mb-[calc(var(--fgo-text,1em)*1.5+0.75rem)] flex max-w-[52rem] justify-end" onClick={(e) => e.stopPropagation()}>
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

      {/* Short toasts at the top. */}
      <div className="pointer-events-none absolute inset-x-0 top-[4.25rem] z-40 flex flex-col items-center gap-2 px-4">
        <StageToast />
      </div>
      <RecapCard />
      {s.panel === "log" && <BacklogPanel />}
      {s.panel === "saves" && <SavePanel />}
      {s.panel === "menu" && <MenuPanel />}
      {s.panel === "help" && <HelpPanel />}
      {s.panel === "scene" && <ScenePanel />}
      {s.panel === "next" && <NextScenePanel />}
    </div>
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
