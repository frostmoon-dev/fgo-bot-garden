import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Label({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{title}</span>
      {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={`field leading-relaxed ${props.className ?? ""}`} />;
}
