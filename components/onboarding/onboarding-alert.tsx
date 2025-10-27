"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function OnboardingAlert() {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.completed) {
          setNeedsOnboarding(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!needsOnboarding) return null;

  return (
    <div className="bg-amber-500 text-center text-sm text-amber-50">
      <Link href="/onboarding" className="inline-block px-4 py-2">
        Complete o setup inicial do painel para liberar o acesso completo.
      </Link>
    </div>
  );
}
