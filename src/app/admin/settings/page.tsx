import { requireMainAdmin } from "@/lib/require-admin";
import { getPlatformSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  await requireMainAdmin();
  const settings = await getPlatformSettings();

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">
        Platform settings
      </h1>
      <SettingsForm
        minAccountAgeDays={settings.minAccountAgeDays}
        sealQualityGateThreshold={settings.sealQualityGateThreshold}
        sealPopularityGateThreshold={settings.sealPopularityGateThreshold}
      />
    </div>
  );
}
