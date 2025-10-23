import { NextResponse } from "next/server";

import {
  getStorageSettings,
  sanitizeSettingsForClient,
  upsertStorageSettings,
} from "@/lib/settings";

export async function GET() {
  try {
    const settings = await getStorageSettings();
    return NextResponse.json({
      settings: sanitizeSettingsForClient(settings),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível carregar as configurações." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const bucketName = String(payload.bucketName ?? "").trim();
    const region = String(payload.region ?? "").trim();
    const accessKey = String(payload.accessKey ?? "").trim();
    const secretKey =
      typeof payload.secretKey === "string" ? payload.secretKey : null;
    const cdnHost = String(payload.cdnHost ?? "").trim();

    if (!bucketName || !region || !accessKey) {
      return NextResponse.json(
        {
          message:
            "Bucket, região e access key são obrigatórios para configurar o storage.",
        },
        { status: 422 },
      );
    }

    const record = await upsertStorageSettings({
      bucketName,
      region,
      accessKey,
      secretKey,
      cdnHost,
    });

    return NextResponse.json({
      message: "Configurações salvas com sucesso.",
      settings: sanitizeSettingsForClient({
        bucketName: record.bucketName ?? "",
        region: record.region ?? "",
        cdnHost: record.cdnHost ?? "",
        accessKey: record.accessKey ?? "",
        secretKey: record.secretKey ?? "",
      }),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Não foi possível salvar as configurações." },
      { status: 500 },
    );
  }
}
