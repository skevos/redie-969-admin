// Server-only session helpers (Web Crypto: works in proxy and route handlers).
// Stateless HMAC-SHA256 signed tokens stored in httpOnly cookies.

export const ADMIN_COOKIE = 'redie_session';
export const PRODUCER_COOKIE = 'redie_producer';
export const ADMIN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
export const PRODUCER_ROLE_MAX_AGE = 12 * 60 * 60; // dashboard users with role 'producer'
export const PRODUCER_MAX_AGE = 12 * 60 * 60; // producer-chat (12h)

export interface SessionPayload {
  uid: string;
  role: string;
  name: string;
  kind: 'admin' | 'producer';
  pid?: string | null;
}

export interface VerifiedSession extends SessionPayload {
  exp: number;
}

export function getSessionSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length > 0 ? s : null;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesFromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSessionToken(payload: SessionPayload, maxAgeSec: number): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error('SESSION_SECRET missing');
  const body: VerifiedSession = { ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSec };
  const data = b64urlFromBytes(enc.encode(JSON.stringify(body)));
  const sig = await crypto.subtle.sign('HMAC', await getKey(secret), enc.encode(data));
  return `${data}.${b64urlFromBytes(new Uint8Array(sig))}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<VerifiedSession | null> {
  try {
    const secret = getSessionSecret();
    if (!secret || !token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, sig] = parts;
    const ok = await crypto.subtle.verify(
      'HMAC',
      await getKey(secret),
      bytesFromB64url(sig) as BufferSource,
      enc.encode(data)
    );
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(bytesFromB64url(data))) as VerifiedSession;
    if (!payload || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.kind !== 'admin' && payload.kind !== 'producer') return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge };
}

// Constant-time string comparison (for shared secrets in headers)
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}
