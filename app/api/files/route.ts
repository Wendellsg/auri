import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  _Object as S3Object,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { buildS3Url, createS3Client, toCdnUrl } from "@/lib/aws";
import { ensureEditor, getSessionFromCookies } from "@/lib/auth";
import { getStorageSettings } from "@/lib/settings";

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

function mapS3Object(object: S3Object, config: Awaited<typeof getStorageSettings>) {
  const key = object.Key ?? "arquivo";
  const url =
    config && key
      ? buildS3Url(config, key)
      : `https://example-bucket.s3.amazonaws.com/${encodeURIComponent(key)}`;

  return {
    key,
    fileName: key.split("/").pop() ?? key,
    size: object.Size ?? 0,
    lastModified: object.LastModified?.toISOString() ?? new Date().toISOString(),
    uploadedBy: object.Owner?.DisplayName ?? "Sistema",
    permissions: object.StorageClass ? [object.StorageClass] : [],
    url,
    cdnUrl: toCdnUrl(url, config?.cdnHost),
  };
}

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const settings = await getStorageSettings();

  if (!settings) {
    return NextResponse.json({
      files: FALLBACK_FILES.map((file) => ({
        ...file,
        cdnUrl: toCdnUrl(file.url),
      })),
      stats: {
        totalFiles: FALLBACK_FILES.length,
        totalSize: FALLBACK_FILES.reduce((acc, curr) => acc + curr.size, 0),
        lastUpdated: FALLBACK_FILES[0]?.lastModified ?? new Date().toISOString(),
        bucket: "configure em /settings",
        cdnHost: "configure em /settings",
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
    const client = createS3Client(settings);

    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: settings.bucketName,
        MaxKeys: 200,
      }),
    );

    const objects = response.Contents ?? [];
    const files = objects
      .filter((object) => object.Key)
      .map((object) => mapS3Object(object, settings))
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
        bucket: settings.bucketName,
        cdnHost: settings.cdnHost || "não configurado",
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
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    ensureEditor(session);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Permissões insuficientes para enviar arquivos.",
      },
      { status: 403 },
    );
  }

  const settings = await getStorageSettings();

  if (!settings) {
    return NextResponse.json(
      {
        message:
          "Credenciais do S3 não configuradas. Acesse o painel de configurações para informar bucket e chaves.",
      },
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
    const client = createS3Client(settings);
    const buffer = Buffer.from(await file.arrayBuffer());

    await client.send(
      new PutObjectCommand({
        Bucket: settings.bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type || undefined,
        Metadata: {
          permissions: permissions.join(","),
        },
      }),
    );

    const url = buildS3Url(settings, key);

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
          cdnUrl: toCdnUrl(url, settings.cdnHost),
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
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    ensureEditor(session);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Permissões insuficientes para remover arquivos.",
      },
      { status: 403 },
    );
  }

  const settings = await getStorageSettings();

  if (!settings) {
    return NextResponse.json(
      {
        message:
          "Credenciais do S3 não configuradas. Acesse o painel de configurações para informar bucket e chaves.",
      },
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
    const client = createS3Client(settings);
    await client.send(
      new DeleteObjectCommand({
        Bucket: settings.bucketName,
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
