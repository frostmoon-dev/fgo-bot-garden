import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Label({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-ink">{title}</span>
      {hint && <span className="block text-xs text-ink-dim">{hint}</span>}
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={`field font-mono text-sm leading-relaxed ${props.className ?? ""}`} />;
}
