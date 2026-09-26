import type { ButtonHTMLAttributes } from "react";

// phoneHidden: only shown from 640px up (the story screen's top bar has room for five buttons on a phone).
export function StageButton({
  active,
  phoneHidden = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; phoneHidden?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(e);
      }}
      aria-pressed={active}
      className={`vn-pill ${phoneHidden ? "hidden sm:inline-flex" : "inline-flex"} min-h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm backdrop-blur-md transition-colors disabled:opacity-40 ${
        active
          ? "bg-accent text-on-accent font-semibold"
          : "bg-canvas/75 text-ink shadow-sm ring-1 ring-ink/10 hover:bg-canvas/90"
      } ${className}`}
    />
  );
}
