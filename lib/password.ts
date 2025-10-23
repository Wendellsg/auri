import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const CHARSETS = {
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lower: "abcdefghijkmnopqrstuvwxyz",
  digits: "23456789",
  symbols: "!@#$%&*?",
};

export function generateSecurePassword(length = 14) {
  const allChars = Object.values(CHARSETS).join("");
  const result: string[] = [];

  // Garantir diversidade mínima
  result.push(sample(CHARSETS.upper));
  result.push(sample(CHARSETS.lower));
  result.push(sample(CHARSETS.digits));
  result.push(sample(CHARSETS.symbols));

  for (let i = result.length; i < length; i += 1) {
    result.push(sample(allChars));
  }

  return shuffle(result).join("");
}

function sample(pool: string) {
  const byte = randomBytes(1)[0];
  return pool[byte % pool.length];
}

function shuffle(values: string[]) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0] % (i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(derived, "hex"));
}
