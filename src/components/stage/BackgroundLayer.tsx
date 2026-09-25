"use client";

import { memo } from "react";
import { useFadeLayers } from "@/components/sprite/useFadeLayers";

export const BackgroundLayer = memo(function BackgroundLayer({ url }: { url: string | null }) {
  const layers = useFadeLayers(url, url, 600);
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-line to-canvas">
      {layers.map((l) => (
        <div
          key={l.key}
          className={`absolute inset-0 bg-cover bg-center ${l.leaving ? "" : "fade-in"}`}
          style={{ backgroundImage: `url("${l.value}")`, ["--fade" as string]: "600ms" }}
        />
      ))}
    </div>
  );
});
