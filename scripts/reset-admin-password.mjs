import { randomBytes, scryptSync } from "crypto";

import { PrismaClient } from "@prisma/client";

const [, , emailArg, passwordArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error("Uso: node scripts/reset-admin-password.mjs <email> <nova_senha>");
  process.exit(1);
}

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  const email = emailArg.toLowerCase();
  const passwordHash = hashPassword(passwordArg);

  const result = await prisma.user.updateMany({
    where: { email },
    data: {
      passwordHash,
      status: "active",
      lastAccessAt: new Date(),
    },
  });

  if (result.count === 0) {
    console.error(`Nenhum usuário encontrado com o e-mail ${emailArg}.`);
    process.exit(2);
  }

  console.log(`Senha atualizada com sucesso para ${emailArg}.`);
}

main()
  .catch((error) => {
    console.error("Falha ao atualizar a senha:", error);
    process.exit(3);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
