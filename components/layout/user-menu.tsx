"use client";

import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export function UserMenu() {
  const router = useRouter();
  const user = useSession();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden flex-col text-right text-xs text-zinc-500 dark:text-zinc-400 sm:flex">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {user.name}
        </span>
        <span className="uppercase tracking-wide">{user.role}</span>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
        <UserRound className="h-4 w-4" />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        title="Encerrar sessão"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
