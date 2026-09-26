"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CommandPalette } from "./CommandPalette";

const links = [
  { href: "/", label: "Home" },
  { href: "/characters", label: "Characters" },
  { href: "/backgrounds", label: "Backgrounds" },
  { href: "/lorebook", label: "Lorebook" },
  { href: "/persona", label: "Persona" },
  { href: "/connection", label: "Connection" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="font-title text-lg font-semibold tracking-[0.08em] text-ink">
          Bot Garden
        </Link>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-palette"))}
          className="ml-auto hidden min-h-10 items-center gap-3 rounded-lg border border-line bg-raised/60 px-3 text-sm text-muted shadow-sm transition-colors hover:text-ink sm:inline-flex md:ml-0"
          title="Search (Ctrl+K)"
        >
          Search
          <kbd className="rounded border border-line bg-canvas px-1.5 font-mono text-[11px] text-muted">Ctrl K</kbd>
        </button>
        <button
          className="ml-auto min-h-10 rounded-lg px-3 text-sm text-muted hover:bg-raised sm:ml-0 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav
          className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-1 border-b border-line bg-canvas px-5 py-4 md:static md:ml-auto md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={active(l.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2.5 text-sm md:py-2 ${active(l.href)
                  ? "border border-accent/35 bg-accent-soft text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-muted hover:bg-raised hover:text-ink"
                }`}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={logout} className="rounded-lg px-3 py-2.5 text-left text-sm text-muted hover:bg-raised hover:text-ink md:ml-2 md:py-2">
            Log out
          </button>
        </nav>
      </div>
      <CommandPalette />
    </header>
  );
}
