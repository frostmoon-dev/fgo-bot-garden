import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { searchStories } from "@/lib/data/queries";

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").slice(0, 200);
  const hits = q.trim().length >= 2 ? await searchStories(q) : [];
  return (
    <>
      <Link href="/" className="inline-flex min-h-10 items-center text-sm text-muted hover:text-ink">
        ← Home
      </Link>
      <PageHeader title="Search stories" description="Find a line in any of your stories: something a character said, a place, a promise." />
      <form action="/search" className="mb-8 flex max-w-2xl gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Words to find
        </label>
        <input id="q" name="q" type="search" defaultValue={q} autoFocus enterKeyHint="search" placeholder="For example: tea" className="field flex-1" />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>
      {q.trim().length >= 2 && (
        <p className="mb-4 text-sm text-muted" role="status">
          {hits.length === 0 ? `Nothing found for “${q.trim()}”. Try a shorter word or another spelling.` : `${hits.length}${hits.length >= 60 ? "+" : ""} found`}
        </p>
      )}
      {q.trim().length === 1 && <p className="mb-4 text-sm text-muted">Type at least two letters.</p>}
      <ul className="max-w-3xl divide-y divide-line">
        {hits.map((h) => (
          <li key={h.messageId}>
            <Link href={`/play/${h.storyId}?at=${h.messageId}`} className="block rounded-lg px-2 py-4 hover:bg-raised">
              <span className="block text-sm text-muted">
                <span className="font-name text-ink">{h.storyTitle}</span>
                {h.role === "user" && " · your line"}
              </span>
              <span className="mt-1 block leading-relaxed">
                {h.before}
                <mark className="rounded bg-accent-soft px-0.5 text-ink">{h.match}</mark>
                {h.after}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
