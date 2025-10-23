import { NextResponse } from "next/server";

import { generateSecurePassword } from "@/lib/password";
import {
  AVAILABLE_PERMISSIONS,
  createUser,
  listUsers,
} from "@/lib/users-store";

export async function GET() {
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
  try {
    const payload = await request.json();
    const name = String(payload.name ?? "").trim();
    const email = String(payload.email ?? "").trim();
    const role = (payload.role ?? "editor") as "admin" | "editor" | "viewer";
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

    const normalizedPermissions = permissions.filter((permission) =>
      AVAILABLE_PERMISSIONS.includes(permission),
    );

    const user = await createUser({
      name,
      email,
      role,
      permissions: normalizedPermissions,
    });

    const password = generateSecurePassword();

    return NextResponse.json(
      {
        user,
        password,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível criar usuário." },
      { status: 500 },
    );
  }
}
