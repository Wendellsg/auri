import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const USERS_FILE = path.join(process.cwd(), "data/users.json");

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "invited" | "blocked";
  permissions: string[];
  createdAt: string;
  lastAccessAt?: string;
};

type StorePayload = {
  users: UserRecord[];
  availablePermissions: string[];
};

const DEFAULT_STORE: StorePayload = {
  users: [],
  availablePermissions: ["upload", "delete", "visualizar", "compartilhar"],
};

export const AVAILABLE_PERMISSIONS = [...DEFAULT_STORE.availablePermissions];

async function ensureStoreExists() {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
    await fs.writeFile(USERS_FILE, JSON.stringify(DEFAULT_STORE, null, 2), "utf-8");
  }
}

async function readStore(): Promise<StorePayload> {
  await ensureStoreExists();
  const raw = await fs.readFile(USERS_FILE, "utf-8");
  return JSON.parse(raw) as StorePayload;
}

async function writeStore(store: StorePayload) {
  await ensureStoreExists();
  await fs.writeFile(USERS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function listUsers() {
  return readStore();
}

export async function createUser(payload: {
  name: string;
  email: string;
  role: UserRecord["role"];
  permissions: string[];
}) {
  const store = await readStore();

  const user: UserRecord = {
    id: randomUUID(),
    name: payload.name,
    email: payload.email.toLowerCase(),
    role: payload.role,
    status: "invited",
    permissions: Array.from(
      new Set(
        payload.permissions.filter((permission) =>
          store.availablePermissions.includes(permission),
        ),
      ),
    ).sort(),
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);

  await writeStore(store);

  return user;
}

export async function touchUserAccess(id: string) {
  const store = await readStore();
  const user = store.users.find((item) => item.id === id);

  if (user) {
    user.lastAccessAt = new Date().toISOString();
    user.status = "active";
    await writeStore(store);
  }

  return user;
}
