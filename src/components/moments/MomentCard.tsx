"use client";

import { SpriteView } from "@/components/sprite/SpriteView";
import { ColorDot } from "@/components/ui/ColorDot";
import type { MomentInput } from "@/lib/moment";

// A kept moment drawn like the story screen: the background, the character, and the line in a window.
export function MomentCard({ moment, large = false }: { moment: MomentInput; large?: boolean }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-raised [container-type:size]">
      {moment.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- user-supplied backgrounds of any size
        <img src={moment.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {moment.sprite && (
        <div className="absolute inset-x-0 bottom-0 flex h-[96%] justify-center">
          <SpriteView grid={moment.sprite.grid} sheetUrl={moment.sprite.sheetUrl} cell={moment.sprite.cell} fade={false} className="h-full" />
        </div>
      )}
      <div
        className={`absolute inset-x-[3%] bottom-[4%] rounded-lg border border-line bg-canvas/85 ${large ? "px-6 py-4 text-base sm:text-lg" : "px-[3%] py-[2.5%] text-[min(3.6cqw,0.95rem)]"}`}
      >
        {moment.speaker && (
          <p className="mb-1 flex items-center gap-2 font-name">
            {moment.color && <ColorDot color={moment.color} />}
            {moment.speaker}
          </p>
        )}
        <p className={`${large ? "" : "line-clamp-2"} leading-normal ${moment.narration ? "vn-narration" : ""}`}>{moment.text}</p>
      </div>
    </div>
  );
}
