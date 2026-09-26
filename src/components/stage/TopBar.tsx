"use client";

import Link from "next/link";
import { StageButton } from "./StageButton";
import { usePlay, usePlayApi } from "./usePlay";

export function TopBar() {
  const auto = usePlay((s) => s.auto);
  const skip = usePlay((s) => s.skip);
  const streaming = usePlay((s) => s.streaming);
  const title = usePlay((s) => s.session.title);
  const { setAuto, setSkip, setPanel, setHideUi, stop } = usePlayApi().getState();

  return (
    <div
      className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-3 sm:px-5"
      onClick={(e) => e.stopPropagation()}
    >
      <Link
        href="/"
        aria-label="Back to home"
        className="vn-pill inline-flex min-h-10 items-center rounded-lg bg-canvas/75 px-3 text-sm shadow-sm ring-1 ring-ink/10 backdrop-blur-md hover:bg-canvas/90"
      >
        ←<span className="ml-1.5 hidden sm:inline">Home</span>
      </Link>
      <p className="vn-pill hidden min-w-0 max-w-sm truncate rounded-lg bg-canvas/75 px-5 py-2 text-sm text-muted backdrop-blur-md lg:block">{title}</p>
      <div className="ml-auto flex gap-1.5 sm:gap-2">
        {streaming && <StageButton onClick={stop}>Stop</StageButton>}
        <StageButton active={auto} onClick={() => setAuto(!auto)} title="Auto (A)">
          Auto
        </StageButton>
        <StageButton active={skip} onClick={() => setSkip(!skip)} title="Skip (S)" className="hidden sm:inline-flex">
          Skip
        </StageButton>
        <StageButton onClick={() => setPanel("log")} title="Log (L)">
          Log
        </StageButton>
        <StageButton onClick={() => setPanel("saves")} title="Save and load" className="hidden sm:inline-flex">
          Save
        </StageButton>
        <StageButton onClick={() => setHideUi(true)} title="Hide the interface (H)" aria-label="Hide the interface" className="hidden sm:inline-flex">
          Hide
        </StageButton>
        <StageButton onClick={() => setPanel("menu")} title="Menu (M)">
          Menu
        </StageButton>
        <StageButton onClick={() => setPanel("help")} title="Controls (?)" aria-label="Controls and shortcuts">
          ?
        </StageButton>
      </div>
    </div>
  );
}
