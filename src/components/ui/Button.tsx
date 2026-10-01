import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "quiet" | "danger";

// The styles live in globals.css (.btn-*), so links can look like buttons too.
// One filled (primary) button per view: the main action.
const styles: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-outline",
  quiet: "btn-quiet",
  danger: "btn-danger",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`btn ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
