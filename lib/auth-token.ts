import { SignJWT, jwtVerify } from "jose";

export type AuthSession = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
};

export const SESSION_COOKIE = "auvp_session";
export const TOKEN_TTL = 60 * 60 * 8; // 8 horas

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não configurado. Defina no .env.");
  }
  return new TextEncoder().encode(secret);
}

export async function createAuthToken(session: AuthSession) {
  const secret = getAuthSecret();
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL}s`)
    .sign(secret);
}

export async function verifyAuthToken(token: string) {
  const secret = getAuthSecret();
  const { payload } = await jwtVerify<AuthSession>(token, secret);
  return payload;
}
