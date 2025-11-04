import { NextResponse } from "next/server";

import {
  createAuthToken,
  getSessionFromCookies,
  setAuthCookie,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AcceptTermsPayload = {
  confirmation?: string;
};

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  let payload: AcceptTermsPayload;
  try {
    payload = (await request.json()) as AcceptTermsPayload;
  } catch {
    return NextResponse.json(
      { message: "Payload inválido. Informe a confirmação." },
      { status: 400 },
    );
  }

  const confirmation = String(payload.confirmation ?? "")
    .trim()
    .toLowerCase();

  if (confirmation !== "entendido") {
    return NextResponse.json(
      {
        message:
          'Para prosseguir, digite exatamente "entendido" no campo de confirmação.',
      },
      { status: 422 },
    );
  }

  if (session.termsAcceptedAt) {
    return NextResponse.json(
      { message: "Termos já aceitos anteriormente.", user: session },
      { status: 200 },
    );
  }

  const now = new Date();

  try {
    const user = await prisma.user.update({
      where: { id: session.id },
      data: { termsAcceptedAt: now },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        termsAcceptedAt: true,
      },
    });

    const updatedSession = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions ?? [],
      termsAcceptedAt: user.termsAcceptedAt
        ? user.termsAcceptedAt.toISOString()
        : null,
    };

    const token = await createAuthToken(updatedSession);
    const response = NextResponse.json({
      message: "Termos aceitos com sucesso.",
      user: updatedSession,
    });
    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível registrar o aceite." },
      { status: 500 },
    );
  }
}
