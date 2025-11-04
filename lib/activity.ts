import { prisma } from "@/lib/prisma";

export type ActivityAction =
  | "file_upload_prepared"
  | "file_deleted"
  | "folder_created";

type LogActivityPayload = {
  userId: string;
  userName: string;
  userEmail: string;
  action: ActivityAction;
  targetKey?: string | null;
  details?: string | null;
};

export async function logActivity({
  userId,
  userName,
  userEmail,
  action,
  targetKey,
  details,
}: LogActivityPayload) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        userName,
        userEmail,
        action,
        targetKey: targetKey || undefined,
        details: details || undefined,
      },
    });
  } catch (error) {
    console.error("Failed to persist activity log", error);
  }
}

export type ActivityLogEntry = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  targetKey: string | null;
  details: string | null;
  createdAt: string;
};

type ListActivityOptions = {
  search?: string;
  limit?: number;
};

export async function listActivityLogs({
  search,
  limit,
}: ListActivityOptions): Promise<ActivityLogEntry[]> {
  const normalizedLimit =
    typeof limit === "number" && limit > 0 && Number.isFinite(limit)
      ? Math.min(Math.floor(limit), 500)
      : 200;

  const trimmedSearch = search?.trim();
  const where = trimmedSearch
    ? {
        OR: [
          { action: { contains: trimmedSearch, mode: "insensitive" as const } },
          {
            userName: {
              contains: trimmedSearch,
              mode: "insensitive" as const,
            },
          },
          {
            userEmail: {
              contains: trimmedSearch,
              mode: "insensitive" as const,
            },
          },
          {
            targetKey: {
              contains: trimmedSearch,
              mode: "insensitive" as const,
            },
          },
          {
            details: {
              contains: trimmedSearch,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : undefined;

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: normalizedLimit,
  });

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    userName: log.userName,
    userEmail: log.userEmail,
    action: log.action,
    targetKey: log.targetKey ?? null,
    details: log.details ?? null,
    createdAt: log.createdAt.toISOString(),
  }));
}
