"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { paletteData, type PaletteData } from "@/app/actions/palette";
import { createSession } from "@/app/actions/sessions";
import { unwrap } from "@/lib/actionResult";

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void | Promise<void>;
}

const PAGES: [string, string, string][] = [
  ["/", "Home", "stories characters start"],
  ["/scene", "Write a scene", "new story premise scenario setting cast"],
  ["/characters", "Characters", "bots edit create import"],
  ["/moments", "Moments", "cards gallery kept lines screenshots"],
  ["/backgrounds", "Backgrounds", "scenes images"],
  ["/lorebook", "Lorebook", "world info lore"],
  ["/persona", "Persona", "you name"],
  ["/connection", "Connection", "ai model api key provider deepseek openrouter openai gemini claude"],
  ["/settings", "Settings", "prompt theme font memory reply length"],
  ["/usage", "Usage", "tokens cost cache requests spending"],
];

// Ctrl+K (or ⌘K): jump to any page, story or character, or start a story, by typing.
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<PaletteData | null>(null);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    paletteData()
      .then(unwrap)
      .then(setData)
      .catch(() => setData({ stories: [], characters: [] }));
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };
  const go = (href: string) => () => {
    close();
    router.push(href);
  };

  const items = useMemo<Item[]>(() => {
    const list: Item[] = PAGES.map(([href, label, words]) => ({ id: href, group: "Go to", label, hint: words, run: go(href) }));
    for (const s of data?.stories ?? []) {
      list.push({ id: `s:${s.id}`, group: "Continue", label: s.title, hint: s.characterName, run: go(`/play/${s.id}`) });
    }
    for (const c of data?.characters ?? []) {
      const forms = c.ascensions.length ? c.ascensions : [{ id: "", name: "" }];
      for (const a of forms) {
        list.push({
          id: `n:${c.id}:${a.id}`,
          group: "New story",
          label: a.name && c.ascensions.length > 1 ? `${c.name} · ${a.name}` : c.name,
          hint: "start",
          run: async () => {
            setBusy(true);
            try {
              const id = unwrap(await createSession(c.id, a.id || null));
              close();
              router.push(`/play/${id}`);
            } finally {
              setBusy(false);
            }
          },
        });
      }
      list.push({ id: `e:${c.id}`, group: "Edit", label: c.name, hint: "character profile ascensions", run: go(`/characters/${c.id}`) });
    }
    const q = query.trim().toLowerCase();
    if (!q) return list.filter((i) => i.group !== "Edit").slice(0, 14);
    return list.filter((i) => `${i.group} ${i.label} ${i.hint ?? ""}`.toLowerCase().includes(q)).slice(0, 20);
    // go/close only change with router, which is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query]);

  if (!open) return null;
  const current = Math.min(active, Math.max(0, items.length - 1));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[12vh]" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-canvas shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && items[current] && !busy) {
              e.preventDefault();
              void items[current].run();
            }
          }}
          placeholder="Go to a page, story or character…"
          aria-label="Search"
          className="w-full border-b border-line bg-transparent px-5 py-4 outline-none placeholder:text-muted"
        />
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nothing found.</li>}
          {items.map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === current}>
              <button
                type="button"
                disabled={busy}
                onMouseEnter={() => setActive(i)}
                onClick={() => void item.run()}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${i === current ? "bg-accent-soft" : ""}`}
              >
                <span className="w-20 shrink-0 text-xs text-muted">{item.group}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">↑↓ to move · Enter to open · Esc to close</p>
      </div>
    </div>
  );
}
