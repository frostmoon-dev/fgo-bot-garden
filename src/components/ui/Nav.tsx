"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChaldeaEmblem } from "./ChaldeaEmblem";
import { CommandPalette } from "./CommandPalette";

const links = [
  { href: "/", label: "Home" },
  { href: "/characters", label: "Characters" },
  { href: "/moments", label: "Moments" },
  { href: "/backgrounds", label: "Backgrounds" },
  { href: "/lorebook", label: "Lorebook" },
  { href: "/persona", label: "Persona" },
  { href: "/connection", label: "Connection" },
  { href: "/settings", label: "Settings" },
];

// On a phone the pages the tab bar has no room for sit under "More".
const MORE = links.filter((l) => !["/", "/characters"].includes(l.href));

async function logout(router: ReturnType<typeof useRouter>) {
  await fetch("/api/logout", { method: "POST" });
  router.replace("/login");
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  // "Write a scene" starts a story, so it belongs under Home.
  // and Usage is part of Settings.
  const active = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/scene") || pathname.startsWith("/search") : pathname.startsWith(href) || (href === "/settings" && pathname.startsWith("/usage"));

  return (
    <>
      <header className="site-nav sticky top-0 z-30 border-b border-line bg-canvas pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:h-16 sm:gap-6 sm:px-8">
          <Link href="/" className="wordmark flex min-h-10 shrink-0 items-center gap-2.5 whitespace-nowrap text-ink" aria-label="Bond Garden, home">
            <ChaldeaEmblem className="size-9 shrink-0 text-accent sm:size-10" />
            <span>Bond Garden</span>
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-palette"))}
            className="ml-auto hidden min-h-10 items-center gap-3 rounded-lg border border-line px-3 text-sm text-muted transition-colors hover:text-ink xl:ml-0 xl:inline-flex"
            title="Search (Ctrl+K)"
          >
            Search
            <kbd className="rounded border border-line bg-canvas px-1.5 font-mono text-[11px] text-muted">Ctrl K</kbd>
          </button>
          <nav className="ml-auto hidden items-center gap-0.5 lg:flex xl:gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active(l.href) ? "page" : undefined}
                className={`flex min-h-10 items-center whitespace-nowrap rounded-lg px-2.5 text-sm xl:px-3 ${
                  active(l.href) ? "bg-white/10 font-semibold text-ink" : "text-muted hover:bg-white/5 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => void logout(router)}
              className="ml-1 flex min-h-10 items-center whitespace-nowrap rounded-lg px-2.5 text-left text-sm text-muted hover:bg-white/5 hover:text-ink xl:ml-2 xl:px-3"
            >
              Log out
            </button>
          </nav>
        </div>
        <CommandPalette />
      </header>
      <TabBar active={active} />
    </>
  );
}

// Phones: the main pages sit at the bottom of the screen, where a thumb reaches them.
function TabBar({ active }: { active: (href: string) => boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [more, setMore] = useState(false);
  const moreActive = MORE.some((l) => active(l.href));

  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [more]);

  const tab = (on: boolean) =>
    `relative flex min-h-14 flex-1 flex-col items-center justify-center text-[0.8rem] ${
      on ? "font-semibold text-ink before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:rounded-full before:bg-accent" : "text-muted"
    }`;

  return (
    <>
      {more && (
        <div className="fade-in fixed inset-0 z-40 bg-black/55 [--fade:150ms] lg:hidden" onClick={() => setMore(false)}>
          <nav
            aria-label="More pages"
            className="panel-in absolute inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] rounded-t-2xl border-t border-line bg-canvas px-3 pb-3 pt-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {MORE.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMore(false)}
                aria-current={active(l.href) ? "page" : undefined}
                className={`flex min-h-12 items-center rounded-lg px-4 ${active(l.href) ? "bg-white/10 font-semibold text-ink" : "text-ink/90"}`}
              >
                {l.label}
              </Link>
            ))}
            <button onClick={() => void logout(router)} className="flex min-h-12 w-full items-center rounded-lg px-4 text-left text-muted">
              Log out
            </button>
          </nav>
        </div>
      )}
      <nav
        aria-label="Main"
        className="site-nav fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <Link href="/" aria-current={active("/") && !pathname.startsWith("/scene") ? "page" : undefined} onClick={() => setMore(false)} className={tab(pathname === "/")}>
          Home
        </Link>
        <Link href="/characters" aria-current={active("/characters") ? "page" : undefined} onClick={() => setMore(false)} className={tab(active("/characters"))}>
          Characters
        </Link>
        <Link href="/scene" aria-current={pathname.startsWith("/scene") ? "page" : undefined} onClick={() => setMore(false)} className={tab(pathname.startsWith("/scene"))}>
          Write
        </Link>
        <button type="button" onClick={() => {
            setMore(false);
            window.dispatchEvent(new Event("open-palette"));
          }}
          className={tab(false)}
        >
          Search
        </button>
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className={tab(more || moreActive)}>
          More
        </button>
      </nav>
    </>
  );
}
