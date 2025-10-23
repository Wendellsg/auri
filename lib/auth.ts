import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  TOKEN_TTL,
  createAuthToken as createToken,
  type AuthSession,
  verifyAuthToken as verifyToken,
} from "@/lib/auth-token";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export {
  SESSION_COOKIE,
  TOKEN_TTL,
  createToken as createAuthToken,
  verifyToken as verifyAuthToken,
};

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) return null;
  if (user.status === "blocked") return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "active",
      lastAccessAt: new Date(),
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  } satisfies AuthSession;
}

export function setAuthCookie(response: NextResponse, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionFromCookies() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export function assertAdmin(session: AuthSession | null) {
  if (!session || session.role !== "admin") {
    throw new Error("Acesso restrito a administradores.");
  }
}

export function ensureAuthenticated(current: AuthSession | null) {
  if (!current) {
    throw new Error("É necessário estar autenticado para utilizar este recurso.");
  }
  return current;
}

export function ensureEditor(current: AuthSession | null) {
  const session = ensureAuthenticated(current);
  if (session.role === "viewer") {
    throw new Error("Seu perfil não possui permissão para esta ação.");
  }
  return session;
}
