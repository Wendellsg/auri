import { S3Client } from "@aws-sdk/client-s3";

import { StorageSettings } from "@/lib/settings";

export function createS3Client(settings: StorageSettings) {
  return new S3Client({
    region: settings.region,
    credentials: {
      accessKeyId: settings.accessKey,
      secretAccessKey: settings.secretKey,
    },
  });
}

export function encodeS3Key(key: string) {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildS3Url(settings: StorageSettings, key: string) {
  return `https://${settings.bucketName}.s3.${settings.region}.amazonaws.com/${encodeS3Key(
    key,
  )}`;
}

export function toCdnUrl(url: string, cdnHost?: string) {
  if (!cdnHost) return url;
  try {
    const nextUrl = new URL(url);
    const normalized = cdnHost.replace(/^https?:\/\//, "");
    nextUrl.host = normalized;
    if (cdnHost.startsWith("https://")) {
      nextUrl.protocol = "https:";
    }
    return nextUrl.toString();
  } catch {
    return url;
  }
}
