import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  _Object as S3Object,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { AWS_REGION, BUCKET_NAME, CDN_HOST, getS3Client, toCdnUrl } from "@/lib/aws";

const FALLBACK_FILES = [
  {
    key: "marketing/campanha-2024.pdf",
    fileName: "campanha-2024.pdf",
    size: 4_152_000,
    lastModified: "2024-10-09T15:22:00.000Z",
    uploadedBy: "Ana Oliveira",
    permissions: ["marketing", "publico"],
    url: "https://example-bucket.s3.amazonaws.com/marketing/campanha-2024.pdf",
  },
  {
    key: "design/guias/brandbook-v2.zip",
    fileName: "brandbook-v2.zip",
    size: 12_512_010,
    lastModified: "2024-10-08T09:10:00.000Z",
    uploadedBy: "Bruno Lima",
    permissions: ["design", "interno"],
    url: "https://example-bucket.s3.amazonaws.com/design/guias/brandbook-v2.zip",
  },
  {
    key: "videos/lancamento-teaser.mp4",
    fileName: "lancamento-teaser.mp4",
    size: 82_425_333,
    lastModified: "2024-10-07T21:45:00.000Z",
    uploadedBy: "Camila Santos",
    permissions: ["marketing", "publico"],
    url: "https://example-bucket.s3.amazonaws.com/videos/lancamento-teaser.mp4",
  },
];

function mapS3Object(object: S3Object) {
  const key = object.Key ?? "arquivo";
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const url = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${encodedKey}`;
  return {
    key,
    fileName: key.split("/").pop() ?? key,
    size: object.Size ?? 0,
    lastModified: object.LastModified?.toISOString() ?? new Date().toISOString(),
    uploadedBy: object.Owner?.DisplayName ?? "Sistema",
    permissions: object.StorageClass ? [object.StorageClass] : [],
    url,
    cdnUrl: toCdnUrl(url),
  };
}

export async function GET() {
  if (!BUCKET_NAME) {
    return NextResponse.json({
      files: FALLBACK_FILES.map((file) => ({
        ...file,
        cdnUrl: toCdnUrl(file.url),
      })),
      stats: {
        totalFiles: FALLBACK_FILES.length,
        totalSize: FALLBACK_FILES.reduce((acc, curr) => acc + curr.size, 0),
        lastUpdated: FALLBACK_FILES[0]?.lastModified ?? new Date().toISOString(),
        bucket: "configurar S3_BUCKET_NAME",
        cdnHost: CDN_HOST ?? "configurar CDN_HOST",
      },
      recentUploads: FALLBACK_FILES.slice(0, 3).map((file) => ({
        id: file.key,
        fileName: file.fileName,
        uploadedAt: file.lastModified,
        uploadedBy: file.uploadedBy,
        size: file.size,
      })),
    });
  }

  try {
    const client = getS3Client();

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 200,
    });

    const response = await client.send(command);
    const objects = response.Contents ?? [];
    const files = objects
      .filter((object) => object.Key)
      .map(mapS3Object)
      .sort(
        (a, b) =>
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
      );

    return NextResponse.json({
      files,
      stats: {
        totalFiles: files.length,
        totalSize: files.reduce((acc, curr) => acc + curr.size, 0),
        lastUpdated: new Date().toISOString(),
        bucket: BUCKET_NAME,
        cdnHost: CDN_HOST ?? "não configurado",
      },
      recentUploads: files.slice(0, 5).map((file) => ({
        id: file.key,
        fileName: file.fileName,
        uploadedAt: file.lastModified,
        uploadedBy: file.uploadedBy,
        size: file.size,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Falha ao consultar objetos no S3." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!BUCKET_NAME) {
    return NextResponse.json(
      { message: "Configure S3_BUCKET_NAME para habilitar uploads." },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Arquivo inválido. Selecione um arquivo para enviar." },
      { status: 400 },
    );
  }

  const prefix = String(formData.get("prefix") ?? "").trim().replace(/^\/|\/$/g, "");
  const permissionsInput = String(formData.get("permissions") ?? "");
  const permissions = permissionsInput
    .split(",")
    .map((permission) => permission.trim())
    .filter(Boolean);

  const key = [prefix, file.name].filter(Boolean).join("/");

  try {
    const client = getS3Client();
    const buffer = Buffer.from(await file.arrayBuffer());

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: file.type || undefined,
        Metadata: {
          permissions: permissions.join(","),
        },
      }),
    );

    const encodedKey = key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const url = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${encodedKey}`;

    return NextResponse.json(
      {
        message: "Upload realizado com sucesso.",
        file: {
          key,
          fileName: file.name,
          size: buffer.byteLength,
          lastModified: new Date().toISOString(),
          permissions,
          url,
          cdnUrl: toCdnUrl(url),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível fazer upload do arquivo." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!BUCKET_NAME) {
    return NextResponse.json(
      { message: "Configure S3_BUCKET_NAME para habilitar exclusões." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { message: "Informe o parâmetro ?key= do arquivo a ser removido." },
      { status: 422 },
    );
  }

  try {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      }),
    );

    return NextResponse.json({ message: "Arquivo removido com sucesso." });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível remover o arquivo." },
      { status: 500 },
    );
  }
}
