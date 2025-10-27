import { hashPassword } from "../lib/password";

const password = process.argv[2];

if (!password) {
  console.error("Uso: npx tsx scripts/hash-password.ts <senha>");
  process.exit(1);
}

console.log(hashPassword(password));
