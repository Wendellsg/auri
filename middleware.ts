import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, verifyAuthToken } from "@/lib/auth-token";
import {
  getCachedOnboardingCompleted,
  setCachedOnboardingCompleted,
} from "@/lib/onboarding-flag";

const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/onboarding",
  "/onboarding",
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/fonts")
  );
}

function unauthorizedResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

async function isOnboardingCompleted(request: NextRequest) {
  const cached = getCachedOnboardingCompleted();
  if (typeof cached === "boolean") {
    return cached;
  }

  const cookieFlag = request.cookies.get("auvp_onboarding")?.value === "1";
  if (cookieFlag) {
    setCachedOnboardingCompleted(true);
    return true;
  }

  try {
    const res = await fetch(new URL("/api/onboarding", request.url), {
      headers: {
        "x-internal-onboarding-check": "1",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      setCachedOnboardingCompleted(true);
      return true;
    }
    const data = await res.json();
    const completed = Boolean(data.completed);
    setCachedOnboardingCompleted(completed);
    return completed;
  } catch {
    setCachedOnboardingCompleted(true);
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAssetPath(pathname)) {
    return NextResponse.next();
  }

  if (request.headers.get("x-internal-onboarding-check") === "1") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (pathname === "/login") {
    if (!token) {
      return NextResponse.next();
    }
    try {
      await verifyAuthToken(token);
      return NextResponse.redirect(new URL("/", request.url));
    } catch {
      return NextResponse.next();
    }
  }

  const onboardingCompleted = await isOnboardingCompleted(request);

  if (!onboardingCompleted && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (onboardingCompleted && pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!token) {
    return unauthorizedResponse(request);
  }

  try {
    await verifyAuthToken(token);
    return NextResponse.next();
  } catch {
    return unauthorizedResponse(request);
  }
}

export const config = {
  matcher: ["/((?!_next/|api/auth/|favicon.ico).*)"],
};
