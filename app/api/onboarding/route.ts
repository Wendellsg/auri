import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth-token";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setCachedOnboardingCompleted } from "@/lib/onboarding-flag";
import { sanitizeSettingsForClient, upsertStorageSettings } from "@/lib/settings";

export async function GET() {
  const state = await prisma.onboardingState.findUnique({ where: { id: 1 } });
  const completed = Boolean(state?.completedAt);
  setCachedOnboardingCompleted(completed);
  return NextResponse.json({ completed });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      appHost,
      adminName,
      adminEmail,
      adminPassword,
      bucketName,
      region,
      accessKey,
      secretKey,
      cdnHost,
    } = body as Record<string, string>;

    if (!appHost || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { message: "Informe host do app e credenciais do administrador." },
        { status: 422 },
      );
    }

    if (!bucketName || !region || !accessKey || !secretKey) {
      return NextResponse.json(
        { message: "Informe bucket, região e chaves da AWS." },
        { status: 422 },
      );
    }

    const adminPasswordHash = hashPassword(adminPassword);

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() },
    });

    if (existingAdmin) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          name: adminName,
          role: "admin",
          status: "active",
          passwordHash: adminPasswordHash,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name: adminName,
          email: adminEmail.toLowerCase(),
          role: "admin",
          status: "active",
          passwordHash: adminPasswordHash,
          permissions: ["upload", "delete", "visualizar", "compartilhar"],
        },
      });
    }

    const settings = await upsertStorageSettings({
      bucketName,
      region,
      accessKey,
      secretKey,
      cdnHost,
    });

    await prisma.appSettings.upsert({
      where: { id: 1 },
      update: {
        appHost,
      },
      create: {
        id: 1,
        appHost,
      },
    });

    await prisma.onboardingState.upsert({
      where: { id: 1 },
      update: { completedAt: new Date() },
      create: { id: 1, completedAt: new Date() },
    });

    const response = NextResponse.json({
      message: "Onboarding concluído.",
      settings: sanitizeSettingsForClient({
        bucketName: settings.bucketName ?? "",
        region: settings.region ?? "",
        cdnHost: settings.cdnHost ?? "",
        accessKey: settings.accessKey ?? "",
        secretKey: settings.secretKey ?? "",
      }),
    });

    const isProd = process.env.NODE_ENV === "production";
    setCachedOnboardingCompleted(true);

    response.cookies.set({
      name: SESSION_COOKIE,
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: isProd,
    });
    response.cookies.set({
      name: "auvp_onboarding",
      value: "1",
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: isProd,
    });
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Falha ao concluir o onboarding." },
      { status: 500 },
    );
  }
}
