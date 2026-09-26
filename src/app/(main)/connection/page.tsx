import { ConnectionForm } from "@/components/library/ConnectionForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { connectionView } from "@/lib/llm/connection";

export default async function ConnectionPage() {
  const view = await connectionView();
  return (
    <>
      <PageHeader
        title="Connection"
        description="The AI model that writes the story. Works with any provider that has an OpenAI-compatible API. Your key stays on the server."
      />
      {/* Keyed so the form resets to the saved values after a save or removal. */}
      <ConnectionForm key={`${view.source}:${view.baseUrl}:${view.model}:${view.keyHint}`} view={view} />
    </>
  );
}
