// Server-only password helpers (Node runtime).
import bcrypt from 'bcryptjs';
import { createHash, timingSafeEqual } from 'crypto';

export const BCRYPT_COST = 10;
// Valid hash of a random throwaway string; used to equalise timing when the user does not exist.
export const DUMMY_HASH = '$2b$10$PVbYQabFMtY7kg9ElTzM3.SlJhr7tS4399zqoKPR/DUzlEc.cydHy';

export function isBcryptHash(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith('$2');
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

// Returns ok + whether the stored value is legacy plaintext (caller re-saves a bcrypt hash on success).
export async function verifyPassword(input: string, stored: string | null | undefined): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (typeof input !== 'string' || !input || typeof stored !== 'string' || !stored) {
    return { ok: false, needsRehash: false };
  }
  if (isBcryptHash(stored)) {
    try {
      return { ok: await bcrypt.compare(input, stored), needsRehash: false };
    } catch {
      return { ok: false, needsRehash: false };
    }
  }
  // Legacy plaintext: constant-time compare of SHA-256 digests (equal length)
  const a = createHash('sha256').update(input, 'utf8').digest();
  const b = createHash('sha256').update(stored, 'utf8').digest();
  const ok = timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
}
