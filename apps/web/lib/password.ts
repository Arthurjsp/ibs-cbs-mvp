import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_PREFIX = "scrypt";

function assertPasswordLength(password: string) {
  if (password.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }
}

export function hashPassword(password: string) {
  assertPasswordLength(password);
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${SCRYPT_PREFIX}:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== SCRYPT_PREFIX) return false;

  const salt = parts[1];
  const hashHex = parts[2];
  const expected = Buffer.from(hashHex, "hex");
  const actual = Buffer.from(scryptSync(password, salt, SCRYPT_KEY_LENGTH));

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

