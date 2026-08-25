import { requireMainAdmin } from "@/lib/require-admin";
import { getPlatformSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  await requireMainAdmin();
  const settings = await getPlatformSettings();

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-8">
      <h1 className="mb-6 font-display text-xl font-bold text-foreground">
        Platform settings
      </h1>
      <SettingsForm
        minAccountAgeDays={settings.minAccountAgeDays}
        sealQualityGateThreshold={settings.sealQualityGateThreshold}
        reviewRateLimitPerHour={settings.reviewRateLimitPerHour}
        commentRateLimitPerHour={settings.commentRateLimitPerHour}
        voteRateLimitPerHour={settings.voteRateLimitPerHour}
        reportRateLimitPerHour={settings.reportRateLimitPerHour}
      />
    </div>
  );
}
