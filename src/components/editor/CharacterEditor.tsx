"use client";

import Link from "next/link";
import { useState } from "react";
import { ColorDot } from "@/components/ui/ColorDot";
import type { BackgroundView, CharacterView } from "@/lib/types";
import { ExpressionEditor } from "./ExpressionEditor";
import { ManageTab } from "./ManageTab";
import { BondSection } from "./BondSection";
import { MemoriesTab } from "./MemoriesTab";
import { ProfileForm } from "./ProfileForm";
import { SpritesTab } from "./SpritesTab";

const TABS = ["Profile", "Ascensions", "Expressions", "Bond & memories", "Manage"] as const;
type Tab = (typeof TABS)[number];

export function CharacterEditor({
  character,
  backgrounds,
  memories,
  bond,
  userName,
}: {
  character: CharacterView;
  backgrounds: BackgroundView[];
  memories: string;
  bond: number;
  userName: string;
}) {
  const [tab, setTab] = useState<Tab>("Profile");
  return (
    <div>
      <Link href="/characters" className="text-sm text-muted hover:text-ink">
        ← Characters
      </Link>
      <h1 className="page-title mt-3 flex items-center gap-3">
        <ColorDot color={character.color} className="size-3.5" />
        {character.name}
      </h1>
      <div role="tablist" className="mb-10 mt-8 flex gap-2 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px min-h-11 border-b-2 px-3 text-sm ${tab === t ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Profile" && <ProfileForm character={character} backgrounds={backgrounds} />}
      {tab === "Expressions" && (
        <ExpressionEditor character={character} />
      )}
      {tab === "Ascensions" && <SpritesTab character={character} />}
      {tab === "Bond & memories" && (
        <>
          <BondSection character={character} points={bond} userName={userName} />
          <MemoriesTab character={character} memories={memories} userName={userName} />
        </>
      )}
      {tab === "Manage" && <ManageTab character={character} />}
    </div>
  );
}
