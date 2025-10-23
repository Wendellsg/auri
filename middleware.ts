import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, verifyAuthToken } from "@/lib/auth-token";

const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAssetPath(pathname)) {
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
