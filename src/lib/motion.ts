// How a sprite moves when its character speaks or changes expression. FGO scripts move sprites by
// feeling: a jump when startled, a shake in anger, a slow sink when sad. Not every character hops,
// so each character (and each ascension) picks a style.

export const MOTION_STYLES = {
  expressive: { label: "Expressive", hint: "Moves with the feeling: jumps when surprised, bounces when laughing, shakes when angry, sinks when sad." },
  bouncy: { label: "Bouncy", hint: "A small hop at every new expression. For energetic, playful characters." },
  calm: { label: "Calm", hint: "Only small, slow moves: a slight nod or dip. For cool, regal or reserved characters." },
  still: { label: "Still", hint: "Never moves; only breathes." },
} as const;

export type MotionStyle = keyof typeof MOTION_STYLES;

export function isMotionStyle(value: string): value is MotionStyle {
  return value in MOTION_STYLES;
}

// The ascension's own style, else the character's.
export function resolveMotion(character: string, ascension?: string | null): MotionStyle {
  if (ascension && isMotionStyle(ascension)) return ascension;
  return isMotionStyle(character) ? character : "expressive";
}

export type Motion = "hop" | "bounce" | "shake" | "sink" | "nod" | "lean";

// Expression ids (the standard list and common variants) grouped by the move they call for.
const BY_FEELING: [RegExp, Motion][] = [
  [/surpris|shock|startl|panic|scared|excit|gasp/, "hop"],
  [/laugh|happy|joy|cheer|grin|delight|eyes_closed_happy/, "bounce"],
  [/angr|furious|rage|shout|yell|frustrat|tantrum/, "shake"],
  [/sad|cry|tear|sob|disappoint|hurt|troubl|gloom|tired|sleepy|sigh|depress/, "sink"],
  [/smug|smirk|sly|teas|curious|proud|wink|flirt|sinister|menac/, "lean"],
];

export function motionFor(style: MotionStyle, expression: string): Motion | null {
  if (style === "still") return null;
  const feeling = BY_FEELING.find(([pattern]) => pattern.test(expression))?.[1] ?? "nod";
  if (style === "calm") return feeling === "sink" ? "sink" : "nod";
  if (style === "bouncy") return feeling === "nod" || feeling === "lean" ? "hop" : feeling;
  return feeling;
}

// Web Animations keyframes. translate is in % of the sprite's own size; the sprite's breathing
// uses transform, so these combine with it instead of replacing it.
export function motionKeyframes(motion: Motion, style: MotionStyle): { frames: Keyframe[]; options: KeyframeAnimationOptions } {
  const soft = style === "calm" ? 0.6 : 1;
  const y = (v: number) => `0 ${(v * soft).toFixed(2)}%`;
  switch (motion) {
    case "hop":
      return { frames: [{ translate: y(0) }, { translate: y(-1.6) }, { translate: y(0) }], options: { duration: 280, easing: "ease-out" } };
    case "bounce":
      return {
        frames: [{ translate: y(0) }, { translate: y(-1.1) }, { translate: y(0) }, { translate: y(-0.7) }, { translate: y(0) }],
        options: { duration: 560, easing: "ease-in-out" },
      };
    case "shake":
      return {
        frames: ["0", "-0.9%", "0.9%", "-0.6%", "0.6%", "-0.3%", "0"].map((x) => ({ translate: `${x} 0` })),
        options: { duration: 380, easing: "linear" },
      };
    case "sink":
      return {
        frames: [{ translate: y(0) }, { translate: y(1), offset: 0.35 }, { translate: y(1), offset: 0.7 }, { translate: y(0) }],
        options: { duration: style === "calm" ? 1400 : 1100, easing: "ease-in-out" },
      };
    case "nod":
      return { frames: [{ translate: y(0) }, { translate: y(0.5) }, { translate: y(0) }], options: { duration: style === "calm" ? 520 : 380, easing: "ease-in-out" } };
    case "lean":
      return { frames: [{ scale: "1" }, { scale: String(1 + 0.018 * soft) }, { scale: "1" }], options: { duration: 520, easing: "ease-in-out" } };
  }
}
