import { CharacterGallery } from "@/components/home/CharacterGallery";
import { SessionList, type SessionRow } from "@/components/home/SessionList";
import { TimeGreeting } from "@/components/home/TimeGreeting";
import { resolveCell } from "@/components/sprite/sheet";
import { SectionTitle } from "@/components/ui/PageHeader";
import { pickAscension } from "@/lib/ascension";
import { bondLevel } from "@/lib/bond";
import { INTERLUDES } from "@/lib/interlude";
import Link from "next/link";
import { getPersona, listBonds, listCharacters, listSessions } from "@/lib/data/queries";
import { connectionView } from "@/lib/llm/connection";
import { ScriptParser, userAliases } from "@/lib/parser";
import { parseScene } from "@/lib/scene";
import type { CharacterView } from "@/lib/types";
import { splitUserText } from "@/lib/userInput";

type SessionRowData = Awaited<ReturnType<typeof listSessions>>[number];

// The last thing said or done in a story, for its card.
function lastLine(s: SessionRowData, characters: CharacterView[], persona: { name: string; addressAs: string }): SessionRow["lastLine"] {
  const userName = persona.name;
  const m = s.messages[0];
  const content = m ? ((m.variants[m.activeVariant] ?? m.variants.at(-1))?.content ?? "") : "";
  if (!m || !content.trim()) return null;
  if (m.role === "user") {
    const part = splitUserText(content, userName).at(-1);
    return part ? { name: part.kind === "say" ? userName : null, text: part.text } : null;
  }
  const lines = new ScriptParser({
    characters: characters.map((c) => ({ id: c.id, name: c.name, aliases: c.aliases, expressions: [] })),
    backgrounds: [],
    mode: "narrative",
    mainCharacterId: s.mainCharacterId,
    userName,
    userAliases: userAliases(persona.addressAs),
  }).parseText(content);
  const line = lines.findLast((l) => (l.type === "dialogue" || l.type === "narration") && l.text);
  if (!line || (line.type !== "dialogue" && line.type !== "narration")) return null;
  return { name: line.type === "dialogue" ? line.name : null, text: line.text.replace(/\{\{\s*user\s*\}\}/gi, userName) };
}

export default async function HomePage() {
  const [characters, sessions, bonds, persona, connection] = await Promise.all([
    listCharacters(),
    listSessions(),
    listBonds(),
    getPersona(),
    connectionView(),
  ]);
  const byId = new Map(characters.map((c) => [c.id, c]));
  // The first interlude each character has unlocked but not started yet, for a "ready" hint on their card.
  const interludeReady = Object.fromEntries(
    characters.flatMap((c) => {
      const started = new Set(sessions.filter((s) => s.mainCharacterId === c.id && s.interlude).map((s) => s.interlude));
      const next = INTERLUDES.find((i) => bondLevel(bonds[c.id] ?? 0) >= i.level && !started.has(i.n));
      return next ? [[c.id, next.n]] : [];
    }),
  );

  const rows: SessionRow[] = sessions.map((s) => {
    const main = byId.get(s.mainCharacterId);
    const set = main ? pickAscension(main, s.cast.find((c) => c.characterId === main.id)?.spriteSetId) : null;
    const scene = parseScene(s.scene);
    return {
      id: s.id,
      title: s.title,
      mode: s.mode,
      updatedAt: s.updatedAt.toISOString(),
      characterName: s.mainCharacter.name,
      color: s.mainCharacter.color,
      messageCount: s._count.messages,
      place: [scene.Location, scene.Time].filter(Boolean).join(" · "),
      lastLine: lastLine(s, characters, persona),
      thumb: set
        ? {
            grid: {
              sheetWidth: set.sheetWidth,
              sheetHeight: set.sheetHeight,
              bodyHeight: set.bodyHeight,
              cellSize: set.cellSize,
              columns: set.columns,
              faceCount: set.faceCount,
              faceX: set.faceX,
              faceY: set.faceY,
            },
            sheetUrl: set.sheetUrl,
            cell: resolveCell(set, "neutral"),
          }
        : null,
    };
  });

  return (
    <>
      <header className="mb-10 sm:mb-12">
        <h1 className="page-title">
          <TimeGreeting name={persona.name} />
        </h1>
        <p className="mt-3 text-muted">
          {rows.length ? "Pick up where you left off, or call on someone new." : "Choose someone to begin your first story."}
        </p>
      </header>

      {connection.source === "none" && (
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/40 bg-accent-soft px-5 py-4">
          <p className="text-sm">
            <strong>Connect an AI model first.</strong> The characters need one to answer: pick a provider and paste an API key.
          </p>
          <Link href="/connection" className="btn btn-primary">
            Connect a model
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <section className="mb-12 sm:mb-16">
          <SectionTitle>Continue a story</SectionTitle>
          <SessionList sessions={rows.slice(0, 6)} highlightFirst />
          {rows.length > 6 && (
            <details className="mt-4">
              <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm text-muted hover:text-ink">
                Show {rows.length - 6} older stories
              </summary>
              <div className="mt-4">
                <SessionList sessions={rows.slice(6)} />
              </div>
            </details>
          )}
        </section>
      )}

      <section>
        <SectionTitle hint="Start a new story. Characters with several ascensions let you pick a form first.">Characters</SectionTitle>
        {characters.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/scene" className="btn btn-outline">
              Write a scene
            </Link>
            <span className="text-sm text-muted">Or set up your own opening and choose who is in it.</span>
          </div>
        )}
        <CharacterGallery characters={characters} bonds={bonds} interludeReady={interludeReady} />
      </section>
    </>
  );
}
