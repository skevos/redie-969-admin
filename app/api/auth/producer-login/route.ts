import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../../../lib/password';
import {
  PRODUCER_COOKIE,
  PRODUCER_MAX_AGE,
  createSessionToken,
  getSessionSecret,
  sessionCookieOptions,
} from '../../../lib/session';
import { PRODUCER_PUBLIC_COLUMNS } from '../../../lib/producerColumns';
import { GENERIC_LOGIN_ERROR, jsonError, secretMissing } from '../../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!getSessionSecret()) return secretMissing();

  let body: any;
  try { body = await req.json(); } catch { return jsonError(GENERIC_LOGIN_ERROR, 400); }
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username || !password) return jsonError(GENERIC_LOGIN_ERROR, 401);

  try {
    const db = getSupabaseAdmin();
    const { data: row } = await db
      .from('producers')
      .select(`${PRODUCER_PUBLIC_COLUMNS}, password`)
      .eq('username', username)
      .eq('is_active', true)
      .maybeSingle();

    if (!row) {
      await verifyPassword(password, DUMMY_HASH);
      return jsonError(GENERIC_LOGIN_ERROR, 401);
    }

    const { password: stored, ...producer } = row as any;
    const { ok, needsRehash } = await verifyPassword(password, stored);
    if (!ok) return jsonError(GENERIC_LOGIN_ERROR, 401);

    if (needsRehash) {
      await db.from('producers').update({ password: await hashPassword(password) }).eq('id', producer.id);
    }

    const token = await createSessionToken(
      { uid: String(producer.id), role: producer.is_admin ? 'producer_admin' : 'producer', name: producer.name || '', kind: 'producer' },
      PRODUCER_MAX_AGE
    );
    const res = NextResponse.json(producer);
    res.cookies.set(PRODUCER_COOKIE, token, sessionCookieOptions(PRODUCER_MAX_AGE));
    return res;
  } catch (e: any) {
    console.error('Producer login error:', e);
    return jsonError(e?.message?.includes('SUPABASE_SERVICE_ROLE_KEY') ? e.message : 'Σφάλμα σύνδεσης', 500);
  }
}
