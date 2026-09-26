"use client";

import { memo, type CSSProperties } from "react";
import type { TimeOfDay, Weather } from "@/lib/scene";

// Stable pseudo-random numbers, so particles keep their places between renders.
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const COUNTS: Record<Weather, number> = { rain: 70, storm: 90, snow: 60, petals: 24, fog: 0 };

// Rain, snow, petals or fog, taken from the scene box's Weather line.
export const WeatherLayer = memo(function WeatherLayer({ kind }: { kind: Weather | null }) {
  if (!kind) return null;
  return (
    <div className="weather fade-in" data-kind={kind} style={{ ["--fade" as string]: "1.2s" }} aria-hidden>
      {Array.from({ length: COUNTS[kind] }, (_, i) => (
        <i
          key={i}
          style={
            {
              left: `${rand(i, 1) * 110 - 5}%`,
              "--delay": `${-rand(i, 2) * 4}s`,
              "--dur": `${0.45 + rand(i, 3) * 0.45}s`,
              "--size": `${3 + rand(i, 4) * 4}px`,
              opacity: 0.4 + rand(i, 5) * 0.6,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
});

// Dawn, dusk and night light, taken from the scene box's Time line.
export function TimeTint({ time, layer }: { time: TimeOfDay | null; layer: "bg" | "all" }) {
  return <div className={layer === "bg" ? "tint-bg" : "tint-all"} data-time={time ?? "day"} aria-hidden />;
}
