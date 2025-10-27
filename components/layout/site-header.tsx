"use client";

import {
  LayoutDashboard,
  Menu,
  Settings2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import { OnboardingAlert } from "@/components/onboarding/onboarding-alert";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const session = useSession();

  const routes = useMemo(() => {
    const base = [
      { href: "/", label: "Arquivos", icon: UploadCloud },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ];
    if (session?.role === "admin") {
      base.push(
        { href: "/users", label: "Usuários", icon: ShieldCheck },
        { href: "/settings", label: "Configurações", icon: Settings2 },
      );
    }
    return base;
  }, [session?.role]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <OnboardingAlert />
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              AU
            </span>
            <div className="hidden flex-col sm:flex">
              <span className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Painel
              </span>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                AUVP Uploader
              </span>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex">
            {routes.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === href : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 font-medium transition",
                    active
                      ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <UserMenu />
          <Button
            size="icon"
            variant="ghost"
            className="sm:hidden"
            onClick={() => setMenuOpen((state) => !state)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {menuOpen ? (
        <div className="border-t border-zinc-200 bg-white px-6 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:hidden">
          <nav className="flex flex-col gap-1">
            {routes.map(({ href, label }) => {
              const active = href === "/" ? pathname === href : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
