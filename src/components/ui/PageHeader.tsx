import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
      <div className="max-w-2xl">
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-5">
      <h2 className="tab-heading">{children}</h2>
      {hint && <p className="mt-2 max-w-xl text-sm text-muted">{hint}</p>}
    </div>
  );
}
