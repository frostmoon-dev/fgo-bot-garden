import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "quiet" | "danger";

const styles: Record<Variant, string> = {
  // One filled button per view: the main action.
  primary: "bg-accent text-on-accent font-semibold shadow-sm hover:brightness-105 active:brightness-95",
  secondary: "border border-line bg-raised text-ink hover:border-muted",
  quiet: "text-muted hover:text-ink hover:bg-raised",
  danger: "text-danger hover:bg-danger/10",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
