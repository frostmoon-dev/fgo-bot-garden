"use client";

import Link from "next/link";
import { StageButton } from "./StageButton";
import { usePlay, usePlayApi } from "./usePlay";

export function TopBar() {
  const auto = usePlay((s) => s.auto);
  const skip = usePlay((s) => s.skip);
  const streaming = usePlay((s) => s.streaming);
  const title = usePlay((s) => s.session.title);
  const { setAuto, setSkip, setPanel, stop } = usePlayApi().getState();

  return (
    <div
      className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center gap-1.5 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-2 sm:p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <Link href="/" className="rounded border border-gold-dim/60 bg-night/70 px-2.5 py-1 text-xs backdrop-blur hover:text-gold sm:text-sm">
        ‹ Home
      </Link>
      <p className="hidden min-w-0 flex-1 truncate font-display text-sm text-ink/80 drop-shadow md:block">{title}</p>
      <div className="ml-auto flex flex-wrap gap-1.5 sm:gap-2">
        {streaming && <StageButton onClick={stop}>Stop</StageButton>}
        <StageButton active={auto} onClick={() => setAuto(!auto)}>
          Auto
        </StageButton>
        <StageButton active={skip} onClick={() => setSkip(!skip)}>
          Skip
        </StageButton>
        <StageButton onClick={() => setPanel("log")}>Log</StageButton>
        <StageButton onClick={() => setPanel("saves")}>Save/Load</StageButton>
        <StageButton onClick={() => setPanel("menu")}>Menu</StageButton>
      </div>
    </div>
  );
}
