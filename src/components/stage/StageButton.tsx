import type { ButtonHTMLAttributes } from "react";

export function StageButton({ active, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(e);
      }}
      aria-pressed={active}
      className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm backdrop-blur-md transition-colors disabled:opacity-40 ${
        active
          ? "bg-accent text-on-accent font-semibold"
          : "bg-canvas/75 text-ink shadow-sm ring-1 ring-ink/10 hover:bg-canvas/90"
      } ${className}`}
    />
  );
}
