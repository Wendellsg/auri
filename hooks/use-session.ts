"use client";

import { useEffect, useState } from "react";

export type SessionUser = {
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  permissions: string[];
};

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let subscribed = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        const sessionUser = data.user as Partial<SessionUser> | null;
        if (!sessionUser) return null;
        return {
          name: sessionUser.name ?? "",
          email: sessionUser.email ?? "",
          role: sessionUser.role ?? "viewer",
          permissions: Array.isArray(sessionUser.permissions)
            ? sessionUser.permissions
            : [],
        };
      })
      .then((sessionUser) => {
        if (subscribed) setUser(sessionUser);
      })
      .catch(() => {
        if (subscribed) setUser(null);
      });
    return () => {
      subscribed = false;
    };
  }, []);

  return user;
}
