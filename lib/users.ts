import { User, UserRole, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const AVAILABLE_PERMISSIONS = [
  "upload",
  "delete",
  "visualizar",
  "compartilhar",
];

export type SafeUser = Omit<User, "passwordHash">;

export function normalizePermissions(permissions: string[] | undefined) {
  return Array.from(
    new Set(
      (permissions ?? []).filter((permission) =>
        AVAILABLE_PERMISSIONS.includes(permission),
      ),
    ),
  ).sort();
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  const safeUsers: SafeUser[] = users.map(({ passwordHash, ...user }) => user);

  return {
    users: safeUsers,
    availablePermissions: AVAILABLE_PERMISSIONS,
  };
}

export async function createUser(payload: {
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  passwordHash: string;
}): Promise<SafeUser> {
  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email.toLowerCase(),
      role: payload.role,
      permissions: normalizePermissions(payload.permissions),
      passwordHash: payload.passwordHash,
    },
  });

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function touchUserAccess(id: string) {
  const user = await prisma.user.update({
    where: { id },
    data: {
      lastAccessAt: new Date(),
      status: "active",
    },
  });

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function updateUser(
  id: string,
  payload: {
    name?: string;
    email?: string;
    role?: UserRole;
    status?: UserStatus;
    permissions?: string[];
    passwordHash?: string;
  },
): Promise<SafeUser> {
  const data: {
    name?: string;
    email?: string;
    role?: UserRole;
    status?: UserStatus;
    permissions?: string[];
    passwordHash?: string;
  } = {};

  if (payload.name !== undefined) {
    data.name = payload.name;
  }
  if (payload.email !== undefined) {
    data.email = payload.email.toLowerCase();
  }
  if (payload.role !== undefined) {
    data.role = payload.role;
  }
  if (payload.status !== undefined) {
    data.status = payload.status;
  }
  if (payload.permissions !== undefined) {
    data.permissions = normalizePermissions(payload.permissions);
  }
  if (payload.passwordHash !== undefined) {
    data.passwordHash = payload.passwordHash;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
