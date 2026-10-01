"use client";

import { useEffect, useRef, useState } from "react";

const FADE_S = 1.2;

interface Track {
  audio: HTMLAudioElement;
  // Web Audio volume: iPhones ignore audio.volume, so loudness and fades go through a gain node when possible.
  gain: GainNode | null;
}

// Background music: the scene's track loops, and a new scene's track fades in as the old one fades out.
// Browsers only allow sound after the reader has tapped or pressed a key, so nothing plays before that.
// The music pauses while the app is in the background.
export function MusicPlayer({ url, volume }: { url: string | null; volume: number }) {
  const [unlocked, setUnlocked] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const current = useRef<{ url: string; track: Track } | null>(null);
  const volumeRef = useRef(volume);

  useEffect(() => {
    const unlock = () => {
      setUnlocked(true);
      try {
        ctxRef.current ??= new AudioContext();
        void ctxRef.current.resume();
      } catch {
        // No Web Audio: plain audio elements still play.
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const target = unlocked && url && volume > 0 ? url : null;

  // Change of track: fade the old one out and the new one in.
  useEffect(() => {
    const ctx = ctxRef.current;
    const old = current.current;
    if (old?.url === target) return;
    if (old) fadeOut(old.track, ctx);
    current.current = null;
    if (!target) return;
    const track = startTrack(target, ctx, volumeRef.current);
    current.current = { url: target, track };
  }, [target]);

  // Volume changes while the same track plays.
  useEffect(() => {
    volumeRef.current = volume;
    const playing = current.current?.track;
    if (playing) setLevel(playing, volume, ctxRef.current, 0.3);
  }, [volume]);

  // Pause in the background, carry on when the reader comes back; stop when leaving the story.
  useEffect(() => {
    const onVisibility = () => {
      const playing = current.current?.track.audio;
      if (!playing) return;
      if (document.hidden) playing.pause();
      else void playing.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      current.current?.track.audio.pause();
      current.current = null;
    };
  }, []);

  return null;
}

function startTrack(url: string, ctx: AudioContext | null, volume: number): Track {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "auto";
  let gain: GainNode | null = null;
  if (ctx) {
    // Web Audio needs the file to allow cross-origin reads (uploads and Supabase do). A link that doesn't
    // fails to load this way, so it is tried once more as a plain audio element.
    audio.crossOrigin = "anonymous";
    try {
      gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
    } catch {
      gain = null;
    }
  }
  const track: Track = { audio, gain };
  audio.addEventListener(
    "error",
    () => {
      if (!gain) return;
      audio.removeAttribute("crossorigin");
      track.gain = null;
      audio.volume = 0;
      audio.src = url;
      void audio.play().then(() => setLevel(track, volume, null, FADE_S)).catch(() => {});
    },
    { once: true },
  );
  if (!gain) audio.volume = 0;
  audio.src = url;
  void audio.play().then(() => setLevel(track, volume, ctx, FADE_S)).catch(() => {});
  return track;
}

function setLevel(track: Track, level: number, ctx: AudioContext | null, seconds: number) {
  if (track.gain && ctx) {
    const g = track.gain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(level, ctx.currentTime + seconds);
    return;
  }
  // Without Web Audio (or on a link without cross-origin access): step the element's own volume.
  const from = track.audio.volume;
  const start = performance.now();
  const step = () => {
    const t = Math.min(1, (performance.now() - start) / (seconds * 1000));
    track.audio.volume = Math.min(1, Math.max(0, from + (level - from) * t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function fadeOut(track: Track, ctx: AudioContext | null) {
  setLevel(track, 0, ctx, FADE_S);
  setTimeout(() => {
    track.audio.pause();
    track.audio.removeAttribute("src");
    track.audio.load();
  }, FADE_S * 1000 + 100);
}
