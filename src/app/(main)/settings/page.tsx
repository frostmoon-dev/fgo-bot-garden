import { SettingsForm } from "@/components/library/SettingsForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSettings } from "@/lib/data/queries";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsForm settings={settings} />
    </>
  );
}
