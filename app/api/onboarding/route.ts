import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth-token";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setCachedOnboardingCompleted } from "@/lib/onboarding-flag";
import {
  APP_SETTINGS_ID,
  sanitizeSettingsForClient,
  upsertStorageSettings,
} from "@/lib/settings";

const ONBOARDING_STATE_ID = "onboarding-state";

export async function GET() {
  const state = await prisma.onboardingState.findUnique({
    where: { id: ONBOARDING_STATE_ID },
  });
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
      where: { id: APP_SETTINGS_ID },
      update: {
        appHost,
      },
      create: {
        id: APP_SETTINGS_ID,
        appHost,
      },
    });

    await prisma.onboardingState.upsert({
      where: { id: ONBOARDING_STATE_ID },
      update: { completedAt: new Date() },
      create: { id: ONBOARDING_STATE_ID, completedAt: new Date() },
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
