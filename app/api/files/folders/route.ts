import {
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { ensureEditor, getSessionFromCookies } from "@/lib/auth";
import { createS3Client } from "@/lib/aws";
import { getStorageSettings } from "@/lib/settings";

type CreateFolderPayload = {
  folderName?: string;
  prefix?: string;
};

const normalizeSegment = (value: string) =>
  value
    .trim()
    .replace(/^\/+|\/+$/g, "");

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
            : "Permissões insuficientes para criar pastas.",
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

  let payload: CreateFolderPayload;

  try {
    payload = (await request.json()) as CreateFolderPayload;
  } catch {
    return NextResponse.json(
      { message: "Payload inválido. Informe o nome da pasta em JSON." },
      { status: 400 }
    );
  }

  const folderNameInput = String(payload.folderName ?? "");
  const folderName = normalizeSegment(folderNameInput);

  if (!folderName) {
    return NextResponse.json(
      { message: "Informe um nome para a nova pasta." },
      { status: 422 }
    );
  }

  if (folderName.includes("/") || folderName.includes("\\")) {
    return NextResponse.json(
      { message: "O nome da pasta não pode conter barras." },
      { status: 422 }
    );
  }

  if (folderName === "." || folderName === "..") {
    return NextResponse.json(
      { message: "Escolha um nome de pasta válido." },
      { status: 422 }
    );
  }

  const prefixInput = String(payload.prefix ?? "");
  const sanitizedPrefix = normalizeSegment(prefixInput);

  const pathSegments = [sanitizedPrefix, folderName].filter(Boolean);
  const folderPath = pathSegments.join("/");
  const folderKey = `${folderPath}/`;

  try {
    const client = createS3Client(settings);

    const existing = await client.send(
      new ListObjectsV2Command({
        Bucket: settings.bucketName,
        Prefix: folderKey,
        MaxKeys: 1,
      })
    );

    if ((existing.KeyCount ?? 0) > 0) {
      return NextResponse.json(
        { message: "Já existe uma pasta com este nome neste nível." },
        { status: 409 }
      );
    }

    await client.send(
      new PutObjectCommand({
        Bucket: settings.bucketName,
        Key: folderKey,
        Body: "",
        Metadata: {
          "auri-folder-placeholder": "true",
        },
      })
    );

    return NextResponse.json(
      { message: "Pasta criada com sucesso.", key: folderKey },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível criar a pasta no bucket." },
      { status: 500 }
    );
  }
}
