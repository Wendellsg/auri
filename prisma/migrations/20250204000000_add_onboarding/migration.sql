-- AlterTable app_settings add appHost
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "appHost" TEXT;

-- CreateTable onboarding_state
CREATE TABLE IF NOT EXISTS "OnboardingState" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "completedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ensure single row
INSERT INTO "OnboardingState" ("id")
  VALUES (1)
  ON CONFLICT ("id") DO NOTHING;
