import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import { NextResponse } from "next/server";

import { getSessionFromCookies } from "@/lib/auth";
import { getStorageSettings } from "@/lib/settings";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json(
      { message: "Você não está logado." },
      { status: 401 },
    );
  }

  // Check if user has permission (admin or upload permission)
  const isAdmin = session.role === "admin";
  const canUpload = session.permissions?.includes("upload") ?? false;

  if (!isAdmin && !canUpload) {
    return NextResponse.json(
      { message: "Você não possui permissão para invalidar o cache." },
      { status: 403 },
    );
  }

  try {
    let path = "/*";
    try {
      const body = await req.json();
      if (body.path && typeof body.path === "string") {
        path = body.path.startsWith("/") ? body.path : `/${body.path}`;
      }
    } catch {
      // Body might be empty or invalid, fallback to "/*"
    }

    const settings = await getStorageSettings();

    if (!settings?.cloudFrontDistributionId) {
      return NextResponse.json(
        { message: "A Distribuição do CloudFront não está configurada." },
        { status: 400 },
      );
    }

    if (!settings.accessKey || !settings.secretKey || !settings.region) {
      return NextResponse.json(
        { message: "Credenciais da AWS ou região não configuradas." },
        { status: 400 },
      );
    }

    const client = new CloudFrontClient({
      region: settings.region,
      credentials: {
        accessKeyId: settings.accessKey,
        secretAccessKey: settings.secretKey,
      },
    });

    const command = new CreateInvalidationCommand({
      DistributionId: settings.cloudFrontDistributionId,
      InvalidationBatch: {
        CallerReference: `auri-invalidation-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: [path],
        },
      },
    });

    await client.send(command);

    return NextResponse.json({
      message: "Invalidação de cache solicitada com sucesso.",
    });
  } catch (error) {
    console.error("CloudFront Invalidation Error:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao solicitar a invalidação de cache.",
      },
      { status: 500 },
    );
  }
}
