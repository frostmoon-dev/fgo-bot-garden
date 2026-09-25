"use client";

import { useState } from "react";
import type { BackgroundView, CharacterView } from "@/lib/types";
import { ExpressionEditor } from "./ExpressionEditor";
import { ManageTab } from "./ManageTab";
import { ProfileForm } from "./ProfileForm";
import { SpritesTab } from "./SpritesTab";

const TABS = ["Profile", "Expressions", "Sprites", "Manage"] as const;
type Tab = (typeof TABS)[number];

export function CharacterEditor({ character, backgrounds }: { character: CharacterView; backgrounds: BackgroundView[] }) {
  const [tab, setTab] = useState<Tab>("Profile");
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="size-3 rounded-full" style={{ background: character.color }} />
        <h1 className="font-display text-2xl" style={{ color: character.color }}>
          {character.name}
        </h1>
      </div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-night-3">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t ? "border-gold text-gold" : "border-transparent text-ink-dim hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Profile" && <ProfileForm character={character} backgrounds={backgrounds} />}
      {tab === "Expressions" && (
        <ExpressionEditor character={character} />
      )}
      {tab === "Sprites" && <SpritesTab character={character} />}
      {tab === "Manage" && <ManageTab character={character} />}
    </div>
  );
}
