import { SettingsForm } from "@/components/library/SettingsForm";
import { getSettings } from "@/lib/data/queries";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold">Settings</h1>
      <SettingsForm settings={settings} />
      <p className="max-w-2xl text-xs text-ink-dim">
        The model, API key and base URL are set in the server environment (LLM_MODEL, LLM_API_KEY, LLM_BASE_URL). They never reach the browser.
      </p>
    </div>
  );
}
