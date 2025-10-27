import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  _Object as S3Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import { ensureEditor, getSessionFromCookies } from "@/lib/auth";
import { buildS3Url, createS3Client, toCdnUrl } from "@/lib/aws";
import { getStorageSettings } from "@/lib/settings";

function mapS3Object(
  object: S3Object,
  config: Awaited<typeof getStorageSettings>
) {
  const key = object.Key ?? "arquivo";
  const url =
    config && key
      ? buildS3Url(config, key)
      : `https://example-bucket.s3.amazonaws.com/${encodeURIComponent(key)}`;

  return {
    key,
    fileName: key.split("/").pop() ?? key,
    size: object.Size ?? 0,
    lastModified:
      object.LastModified?.toISOString() ?? new Date().toISOString(),
    uploadedBy: object.Owner?.DisplayName ?? "Sistema",
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
    return NextResponse.json(
      {
        message: "No settings",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const client = createS3Client(settings);

    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: settings.bucketName,
        MaxKeys: 200,
      })
    );

    const objects = response.Contents ?? [];
    const files = objects
      .filter((object) => object.Key)
      .map((object) => mapS3Object(object, settings))
      .sort(
        (a, b) =>
          new Date(b.lastModified).getTime() -
          new Date(a.lastModified).getTime()
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
      { status: 500 }
    );
  }
}

type PresignPayload = {
  fileName?: string;
  contentType?: string;
  prefix?: string;
  size?: number;
};

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
      { status: 403 }
    );
  }

  const settings = await getStorageSettings();

  if (!settings) {
    return NextResponse.json(
      {
        message:
          "Credenciais do S3 não configuradas. Acesse o painel de configurações para informar bucket e chaves.",
      },
      { status: 400 }
    );
  }

  let payload: PresignPayload;

  try {
    payload = (await request.json()) as PresignPayload;
  } catch {
    return NextResponse.json(
      { message: "Payload inválido. Envie os metadados do arquivo em JSON." },
      { status: 400 }
    );
  }

  const fileName = String(payload.fileName ?? "").trim();
  if (!fileName) {
    return NextResponse.json(
      { message: "Informe o nome do arquivo para gerar o upload." },
      { status: 400 }
    );
  }

  const prefix = String(payload.prefix ?? "")
    .trim()
    .replace(/^\/|\/$/g, "");

  const key = [prefix, fileName].filter(Boolean).join("/");

  const contentType = payload.contentType
    ? String(payload.contentType).trim()
    : undefined;

  const FIVE_GB = 5 * 1024 * 1024 * 1024;
  if (typeof payload.size === "number" && payload.size > FIVE_GB) {
    return NextResponse.json(
      {
        message:
          "Tamanho máximo permitido para uploads é de 5GB. Considere fracionar o arquivo.",
      },
      { status: 413 }
    );
  }

  try {
    const client = createS3Client(settings);
    const command = new PutObjectCommand({
      Bucket: settings.bucketName,
      Key: key,
      ContentType: contentType || undefined,
    });

    const expiresIn = 60 * 10; // 10 minutes
    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    const url = buildS3Url(settings, key);
    const cdnUrl = toCdnUrl(url, settings.cdnHost);

    return NextResponse.json(
      {
        message: "URL de upload gerada com sucesso.",
        uploadUrl,
        key,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        headers: contentType ? { "Content-Type": contentType } : {},
        publicUrl: url,
        cdnUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível gerar a URL assinada para upload." },
      { status: 500 }
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
      { status: 403 }
    );
  }

  const settings = await getStorageSettings();

  if (!settings) {
    return NextResponse.json(
      {
        message:
          "Credenciais do S3 não configuradas. Acesse o painel de configurações para informar bucket e chaves.",
      },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json(
      { message: "Informe o parâmetro ?key= do arquivo a ser removido." },
      { status: 422 }
    );
  }

  try {
    const client = createS3Client(settings);
    await client.send(
      new DeleteObjectCommand({
        Bucket: settings.bucketName,
        Key: key,
      })
    );

    return NextResponse.json({ message: "Arquivo removido com sucesso." });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível remover o arquivo." },
      { status: 500 }
    );
  }
}
