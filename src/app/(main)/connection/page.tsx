import Link from "next/link";
import { ConnectionForm } from "@/components/library/ConnectionForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { connectionView } from "@/lib/llm/connection";

export default async function ConnectionPage({ searchParams }: PageProps<"/connection">) {
  const slot = (await searchParams).model === "backup" ? 2 : 1;
  const view = await connectionView(slot);
  const tab = (on: boolean) =>
    `flex min-h-11 items-center border-b-2 px-4 text-sm ${on ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`;
  return (
    <>
      <PageHeader
        title="Connection"
        description="The AI model that writes the story. Works with any provider that has an OpenAI-compatible API. Your key stays on the server."
      />
      <nav aria-label="Which model" className="mb-8 flex gap-2 border-b border-line">
        <Link href="/connection" aria-current={slot === 1 ? "page" : undefined} className={tab(slot === 1)}>
          Main model
        </Link>
        <Link href="/connection?model=backup" aria-current={slot === 2 ? "page" : undefined} className={tab(slot === 2)}>
          Backup model
        </Link>
      </nav>
      {/* Keyed so the form resets to the saved values after a save or removal, and when switching tabs. */}
      <ConnectionForm key={`${slot}:${view.source}:${view.baseUrl}:${view.model}:${view.keyHint}`} view={view} slot={slot} />
    </>
  );
}
