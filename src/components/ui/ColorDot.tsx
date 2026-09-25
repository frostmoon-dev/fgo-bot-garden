// Character colors are shown as a swatch, not as text color, so names stay readable on every theme.
export function ColorDot({ color, className = "" }: { color: string; className?: string }) {
  return <span aria-hidden className={`inline-block size-2.5 shrink-0 rounded-full ${className}`} style={{ background: color }} />;
}
