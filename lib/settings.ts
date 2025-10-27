import { prisma } from "@/lib/prisma";

export type StorageSettings = {
  bucketName: string;
  region: string;
  cdnHost: string;
  accessKey: string;
  secretKey: string;
};

export async function getAppHost() {
  const record = await prisma.appSettings.findUnique({ where: { id: 1 } });
  return record?.appHost ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
}

function getEnvStorageSettings(): StorageSettings | null {
  const bucket =
    process.env.S3_BUCKET_NAME ??
    process.env.AWS_S3_BUCKET ??
    process.env.NEXT_PUBLIC_S3_BUCKET ??
    "";
  const region =
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    process.env.NEXT_PUBLIC_AWS_REGION ??
    "";
  const cdn =
    process.env.CDN_HOST ?? process.env.NEXT_PUBLIC_CDN_HOST ?? "";
  const accessKey = process.env.AWS_ACCESS_KEY_ID ?? "";
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY ?? "";

  if (bucket && region && accessKey && secretKey) {
    return {
      bucketName: bucket,
      region,
      cdnHost: cdn,
      accessKey,
      secretKey,
    };
  }

  return null;
}

export async function getStorageSettings() {
  const record = await prisma.appSettings.findUnique({
    where: { id: 1 },
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

  return getEnvStorageSettings();
}

export async function upsertStorageSettings(payload: {
  bucketName: string;
  region: string;
  cdnHost?: string;
  accessKey: string;
  secretKey?: string | null;
}) {
  const existing = await prisma.appSettings.findUnique({
    where: { id: 1 },
  });

  const secretKey = payload.secretKey?.trim()
    ? payload.secretKey.trim()
    : existing?.secretKey ?? null;

  const record = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {
      bucketName: payload.bucketName,
      region: payload.region,
      cdnHost: payload.cdnHost ?? "",
      accessKey: payload.accessKey,
      secretKey,
    },
    create: {
      id: 1,
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
