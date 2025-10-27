import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { assertAdmin, getSessionFromCookies } from "@/lib/auth";
import { generateSecurePassword, hashPassword } from "@/lib/password";
import { updateUser } from "@/lib/users";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  let idFromParams = "";
  try {
    const resolvedParams = await context.params;
    idFromParams = resolvedParams?.id ?? "";
  } catch {
    idFromParams = "";
  }
  const idFromBody =
    typeof payload.id === "string" ? payload.id.trim() : "";
  const id = (idFromParams || idFromBody).trim();

  try {
    const updates: {
      name?: string;
      email?: string;
      role?: UserRole;
      status?: UserStatus;
      permissions?: string[];
      passwordHash?: string;
    } = {};

    if (!id) {
      return NextResponse.json(
        { message: "Informe o usuário desejado." },
        { status: 400 },
      );
    }

    if ("name" in payload) {
      const name = String(payload.name ?? "").trim();
      if (!name) {
        return NextResponse.json(
          { message: "Informe um nome válido." },
          { status: 422 },
        );
      }
      updates.name = name;
    }

    if ("email" in payload) {
      const email = String(payload.email ?? "").trim();
      if (!email) {
        return NextResponse.json(
          { message: "Informe um e-mail válido." },
          { status: 422 },
        );
      }
      updates.email = email;
    }

    if ("role" in payload) {
      const role = String(payload.role ?? "") as UserRole;
      if (!Object.values(UserRole).includes(role)) {
        return NextResponse.json(
          { message: "Perfil inválido." },
          { status: 422 },
        );
      }
      updates.role = role;
    }

    if ("status" in payload) {
      const status = String(payload.status ?? "") as UserStatus;
      if (!Object.values(UserStatus).includes(status)) {
        return NextResponse.json(
          { message: "Status inválido." },
          { status: 422 },
        );
      }
      updates.status = status;
    }

    if ("permissions" in payload) {
      const permissions = Array.isArray(payload.permissions)
        ? payload.permissions
        : String(payload.permissions ?? "")
            .split(",")
            .map((permission: string) => permission.trim())
            .filter(Boolean);

      updates.permissions = permissions.map((permission: unknown) =>
        String(permission),
      );
    }

    let regeneratedPassword: string | undefined;

    if (payload.regeneratePassword) {
      regeneratedPassword = generateSecurePassword();
      updates.passwordHash = hashPassword(regeneratedPassword);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "Informe ao menos um campo para atualizar." },
        { status: 422 },
      );
    }

    const user = await updateUser(id, updates);

    const responseBody: {
      user: typeof user;
      password?: string;
    } = { user };

    if (regeneratedPassword) {
      responseBody.password = regeneratedPassword;
    }

    return NextResponse.json(responseBody);
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
      { message: "Não foi possível atualizar o usuário." },
      { status: 500 },
    );
  }
}
