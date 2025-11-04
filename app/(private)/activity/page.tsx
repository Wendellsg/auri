import { redirect } from "next/navigation";

import { ActivityDashboard } from "@/components/dashboard/activity-dashboard";
import { getSessionFromCookies } from "@/lib/auth";

export default async function ActivityPage() {
  const session = await getSessionFromCookies();

  if (!session || session.role !== "admin") {
    redirect("/");
  }

  return <ActivityDashboard />;
}
