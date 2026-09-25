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
      className={`rounded border px-2.5 py-1 text-xs font-medium tracking-wide backdrop-blur transition disabled:opacity-40 sm:text-sm ${
        active ? "border-gold bg-gold/20 text-gold" : "border-gold-dim/60 bg-night/70 text-ink hover:border-gold hover:text-gold"
      } ${className}`}
    />
  );
}
