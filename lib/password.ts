import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

function isBcryptHash(stored: string): boolean {
  return typeof stored === "string" && stored.startsWith("$2");
}

/** Pre-upgrade storage: base64(password). Not secure — used only for legacy verify + migrate. */
export function verifyLegacyBase64Password(
  password: string,
  stored: string,
): boolean {
  try {
    return Buffer.from(password, "utf8").toString("base64") === stored;
  } catch {
    return false;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password. If legacy base64 matches, returns upgradedHash so caller can persist bcrypt.
 */
export async function verifyPasswordWithOptionalUpgrade(
  password: string,
  storedHash: string,
): Promise<{ ok: boolean; upgradedHash?: string }> {
  if (isBcryptHash(storedHash)) {
    const ok = await bcrypt.compare(password, storedHash);
    return { ok };
  }
  if (verifyLegacyBase64Password(password, storedHash)) {
    return { ok: true, upgradedHash: await hashPassword(password) };
  }
  return { ok: false };
}
