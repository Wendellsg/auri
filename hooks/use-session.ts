"use client";

import { useEffect, useState } from "react";

type SessionUser = {
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
};

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let subscribed = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        return data.user as SessionUser;
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
