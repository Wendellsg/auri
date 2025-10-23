import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { assertAdmin, getSessionFromCookies } from "@/lib/auth";
import { generateSecurePassword, hashPassword } from "@/lib/password";
import {
  AVAILABLE_PERMISSIONS,
  createUser,
  listUsers,
  normalizePermissions,
} from "@/lib/users";

export async function GET() {
  const session = await getSessionFromCookies();
  try {
    assertAdmin(session);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Acesso restrito a administradores.",
      },
      { status: 403 },
    );
  }

  try {
    const store = await listUsers();
    return NextResponse.json(store);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível carregar usuários." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  try {
    assertAdmin(session);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Acesso restrito a administradores.",
      },
      { status: 403 },
    );
  }

  try {
    const payload = await request.json();
    const name = String(payload.name ?? "").trim();
    const email = String(payload.email ?? "").trim();
    const role = (payload.role ?? "editor") as UserRole;
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions
      : String(payload.permissions ?? "")
          .split(",")
          .map((permission: string) => permission.trim())
          .filter(Boolean);

    if (!name || !email) {
      return NextResponse.json(
        { message: "Informe nome e e-mail para criar um usuário." },
        { status: 422 },
      );
    }

    const normalizedPermissions = normalizePermissions(permissions);
    const password = generateSecurePassword();
    const passwordHash = hashPassword(password);

    const user = await createUser({
      name,
      email,
      role,
      permissions: normalizedPermissions,
      passwordHash,
    });

    return NextResponse.json(
      {
        user,
        password,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Já existe um usuário cadastrado com este e-mail." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: "Não foi possível criar usuário." },
      { status: 500 },
    );
  }
}
