import { randomBytes, scryptSync } from 'crypto';

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/hash-password.mjs <senha>');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const derived = scryptSync(password, salt, 64).toString('hex');
console.log(`${salt}:${derived}`);
