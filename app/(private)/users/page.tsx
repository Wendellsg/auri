import { redirect } from "next/navigation";

import { UsersDashboard } from "@/components/dashboard/users-dashboard";
import { getSessionFromCookies } from "@/lib/auth";

export default async function UsersPage() {
  const session = await getSessionFromCookies();

  if (!session || session.role !== "admin") {
    redirect("/");
  }

  return <UsersDashboard />;
}
