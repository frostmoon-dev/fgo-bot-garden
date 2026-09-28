"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChaldeaEmblem } from "./ChaldeaEmblem";
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

  // "Write a scene" starts a story, so it belongs under Home.
  const active = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/scene") : pathname.startsWith(href));

  return (
    <header className="site-nav sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:h-16 sm:gap-6 sm:px-8">
        <Link href="/" className="wordmark flex min-h-10 items-center gap-2.5 text-ink" aria-label="Bond Garden, home">
          <ChaldeaEmblem className="size-9 shrink-0 text-accent sm:size-10" />
          <span>Bond Garden</span>
        </Link>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-palette"))}
          className="ml-auto hidden min-h-10 items-center gap-3 rounded-lg border border-line px-3 text-sm text-muted transition-colors hover:text-ink sm:inline-flex md:ml-0"
          title="Search (Ctrl+K)"
        >
          Search
          <kbd className="rounded border border-line bg-canvas px-1.5 font-mono text-[11px] text-muted">Ctrl K</kbd>
        </button>
        <button
          className="btn btn-outline ml-auto min-h-10 sm:ml-0 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav
          className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-1 border-b border-line bg-canvas px-4 py-3 shadow-xl md:static md:ml-auto md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={active(l.href) ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3 text-[0.95rem] md:min-h-10 md:text-sm ${
                active(l.href) ? "bg-white/10 font-semibold text-ink" : "text-muted hover:bg-white/5 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={logout} className="flex min-h-11 items-center rounded-lg px-3 text-left text-[0.95rem] text-muted hover:bg-white/5 hover:text-ink md:ml-2 md:min-h-10 md:text-sm">
            Log out
          </button>
        </nav>
      </div>
      <CommandPalette />
    </header>
  );
}
