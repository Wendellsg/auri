import { redirect } from "next/navigation";

import { SettingsDashboard } from "@/components/dashboard/settings-dashboard";
import { getSessionFromCookies } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getSessionFromCookies();

  if (!session || session.role !== "admin") {
    redirect("/");
  }

  return <SettingsDashboard />;
}
