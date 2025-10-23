import { S3Client } from "@aws-sdk/client-s3";

const region =
  process.env.AWS_REGION ??
  process.env.AWS_DEFAULT_REGION ??
  process.env.NEXT_PUBLIC_AWS_REGION;

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!region) {
  console.warn("AWS region não configurada. Defina AWS_REGION nas variáveis de ambiente.");
}

let client: S3Client | null = null;

export function getS3Client() {
  if (!client) {
    client = new S3Client({
      region: region ?? "us-east-1",
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });
  }

  return client;
}

export const BUCKET_NAME = process.env.S3_BUCKET_NAME ?? process.env.AWS_S3_BUCKET;
export const CDN_HOST = process.env.CDN_HOST ?? process.env.NEXT_PUBLIC_CDN_HOST;
export const AWS_REGION = region ?? "us-east-1";

export function toCdnUrl(s3Url: string) {
  if (!CDN_HOST) return s3Url;
  try {
    const url = new URL(s3Url);
    url.host = CDN_HOST.replace(/^https?:\/\//, "");
    url.protocol = CDN_HOST.startsWith("https") ? "https:" : url.protocol;
    return url.toString();
  } catch {
    return s3Url;
  }
}
