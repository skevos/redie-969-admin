import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../../../lib/password';
import {
  ADMIN_COOKIE,
  ADMIN_MAX_AGE,
  PRODUCER_ROLE_MAX_AGE,
  createSessionToken,
  getSessionSecret,
  sessionCookieOptions,
} from '../../../lib/session';
import { GENERIC_LOGIN_ERROR, checkProducerTimeWindow, jsonError, logAudit, secretMissing } from '../../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(req: NextRequest) {
  if (!getSessionSecret()) return secretMissing();

  let body: any;
  try { body = await req.json(); } catch { return jsonError(GENERIC_LOGIN_ERROR, 400); }
  const username = typeof body?.username === 'string' ? body.username.toLowerCase().trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username || !password) return jsonError(GENERIC_LOGIN_ERROR, 401);

  try {
    const db = getSupabaseAdmin();
    const { data: user, error } = await db
      .from('dashboard_users')
      .select('id, username, password_hash, display_name, role, producer_id, is_active, failed_login_attempts, locked_until')
      .eq('username', username)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !user) {
      await verifyPassword(password, DUMMY_HASH);
      await logAudit(null, 'login_failed', { username, reason: 'user_not_found' });
      return jsonError(GENERIC_LOGIN_ERROR, 401);
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return jsonError('Ο λογαριασμός είναι κλειδωμένος. Δοκιμάστε αργότερα.', 423);
    }

    const { ok, needsRehash } = await verifyPassword(password, user.password_hash);
    if (!ok) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null;
      await db.from('dashboard_users').update({ failed_login_attempts: attempts, locked_until: lockUntil }).eq('id', user.id);
      await logAudit(user.id, 'login_failed', { reason: 'wrong_password', attempts });
      return jsonError(GENERIC_LOGIN_ERROR, 401);
    }

    if (user.role === 'producer') {
      const access = await checkProducerTimeWindow(user.producer_id);
      if (!access.allowed) {
        await logAudit(user.id, 'login_denied_time', { reason: access.reason });
        return jsonError(access.reason || GENERIC_LOGIN_ERROR, 403);
      }
    }

    const update: Record<string, any> = {
      failed_login_attempts: 0,
      locked_until: null,
      last_login: new Date().toISOString(),
    };
    if (needsRehash) update.password_hash = await hashPassword(password); // transparent bcrypt migration
    await db.from('dashboard_users').update(update).eq('id', user.id);
    await logAudit(user.id, 'login_success', { role: user.role, migrated: needsRehash });

    const maxAge = user.role === 'producer' ? PRODUCER_ROLE_MAX_AGE : ADMIN_MAX_AGE;
    const token = await createSessionToken(
      { uid: user.id, role: user.role, name: user.display_name || user.username, kind: 'admin', pid: user.producer_id ?? null },
      maxAge
    );

    const res = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        producer_id: user.producer_id,
        is_active: user.is_active,
      },
    });
    res.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions(maxAge));
    return res;
  } catch (e: any) {
    console.error('Login error:', e);
    return jsonError(e?.message?.includes('SUPABASE_SERVICE_ROLE_KEY') ? e.message : 'Σφάλμα σύνδεσης', 500);
  }
}
