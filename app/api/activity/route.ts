import { NextResponse } from "next/server";

import { getSessionFromCookies } from "@/lib/auth";
import { listActivityLogs } from "@/lib/activity";

export async function GET(request: Request) {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json(
      { message: "Apenas administradores podem visualizar as atividades." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const logs = await listActivityLogs({ search, limit });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível recuperar as atividades." },
      { status: 500 },
    );
  }
}
