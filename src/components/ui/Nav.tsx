"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/characters", label: "Characters" },
  { href: "/backgrounds", label: "Backgrounds" },
  { href: "/lorebook", label: "Lorebook" },
  { href: "/persona", label: "Persona" },
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
    <header className="sticky top-0 z-30 border-b border-night-3 bg-night/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="font-display text-lg tracking-wide text-gold">
          Bot Garden
        </Link>
        <button
          className="ml-auto rounded border border-night-3 px-2 py-1 text-sm md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Menu
        </button>
        <nav className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-1 border-b border-night-3 bg-night p-3 md:static md:ml-auto md:flex md:flex-row md:border-0 md:bg-transparent md:p-0`}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`rounded px-2.5 py-1.5 text-sm ${active(l.href) ? "bg-night-3 text-gold" : "text-ink-dim hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={logout} className="rounded px-2.5 py-1.5 text-left text-sm text-ink-dim hover:text-danger">
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
