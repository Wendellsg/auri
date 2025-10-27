import { prisma } from "@/lib/prisma";

export const APP_SETTINGS_ID = "app-settings";

export type StorageSettings = {
  bucketName: string;
  region: string;
  cdnHost: string;
  accessKey: string;
  secretKey: string;
};

export async function getAppHost() {
  const record = await prisma.appSettings.findUnique({
    where: { id: APP_SETTINGS_ID },
  });
  return record?.appHost ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
}

export async function getStorageSettings() {
  const record = await prisma.appSettings.findUnique({
    where: { id: APP_SETTINGS_ID },
  });

  if (
    record?.bucketName &&
    record?.region &&
    record?.accessKey &&
    record?.secretKey
  ) {
    return {
      bucketName: record.bucketName,
      region: record.region,
      cdnHost: record.cdnHost ?? "",
      accessKey: record.accessKey,
      secretKey: record.secretKey,
    } satisfies StorageSettings;
  }

  return null;
}

export async function upsertStorageSettings(payload: {
  bucketName: string;
  region: string;
  cdnHost?: string;
  accessKey: string;
  secretKey?: string | null;
}) {
  const existing = await prisma.appSettings.findUnique({
    where: { id: APP_SETTINGS_ID },
  });

  const secretKey = payload.secretKey?.trim()
    ? payload.secretKey.trim()
    : existing?.secretKey ?? null;

  const record = await prisma.appSettings.upsert({
    where: { id: APP_SETTINGS_ID },
    update: {
      bucketName: payload.bucketName,
      region: payload.region,
      cdnHost: payload.cdnHost ?? "",
      accessKey: payload.accessKey,
      secretKey,
    },
    create: {
      id: APP_SETTINGS_ID,
      bucketName: payload.bucketName,
      region: payload.region,
      cdnHost: payload.cdnHost ?? "",
      accessKey: payload.accessKey,
      secretKey,
    },
  });

  return record;
}

export function sanitizeSettingsForClient(settings: StorageSettings | null) {
  if (!settings) {
    return {
      bucketName: "",
      region: "",
      cdnHost: "",
      accessKey: "",
      hasSecretKey: false,
    };
  }

  return {
    bucketName: settings.bucketName,
    region: settings.region,
    cdnHost: settings.cdnHost,
    accessKey: settings.accessKey,
    hasSecretKey: Boolean(settings.secretKey),
  };
}
