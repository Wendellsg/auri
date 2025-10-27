import { NextResponse } from "next/server";

import { authenticateUser, createAuthToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { message: "Informe e-mail e senha." },
        { status: 400 },
      );
    }

    const session = await authenticateUser(email, password);

    if (!session) {
      return NextResponse.json(
        { message: "Credenciais inválidas ou usuário bloqueado." },
        { status: 401 },
      );
    }

    const token = await createAuthToken(session);
    const response = NextResponse.json({ user: session });
    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível autenticar agora." },
      { status: 500 },
    );
  }
}
