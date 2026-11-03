import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { hashPassword } from '../../../../lib/password';
import { jsonError, logAudit, requireAdmin } from '../../../../lib/serverAuth';
import { findLogin, getAllUsernames, getUsername, setCredentials } from '../../../../lib/producerCredentials';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET ?id=123 -> { username }            (never the password)
// GET (no id) -> { usernames: { [id]: username|null } }  (for the producers list badges)
export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  const id = req.nextUrl.searchParams.get('id');
  try {
    const db = getSupabaseAdmin();
    if (id) {
      const { data: exists } = await db.from('producers').select('id').eq('id', id).maybeSingle();
      if (!exists) return jsonError('Not found', 404);
      return NextResponse.json({ username: await getUsername(db, id) });
    }
    return NextResponse.json({ usernames: await getAllUsernames(db) });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}

// POST { id, username?, password? } -> sets trimmed username (empty = remove login) and/or bcrypt password
export async function POST(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  let b: any;
  try { b = await req.json(); } catch { return jsonError('Invalid JSON', 400); }
  if (!b?.id) return jsonError('Missing id', 400);
  const update: Record<string, any> = {};
  if (typeof b.username === 'string') update.username = b.username.trim() || null;
  if (typeof b.password === 'string' && b.password) update.password = await hashPassword(b.password);
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });
  try {
    const db = getSupabaseAdmin();
    const { data: exists } = await db.from('producers').select('id').eq('id', b.id).maybeSingle();
    if (!exists) return jsonError('Not found', 404);
    if (update.username) {
      const taken = await findLogin(db, update.username);
      if (taken && String(taken.producer_id) !== String(b.id)) return jsonError('Το username χρησιμοποιείται ήδη', 400);
    }
    await setCredentials(db, b.id, update);
    await logAudit(s.uid, 'producer_credentials_updated', { id: b.id, username: 'username' in update, password: 'password' in update });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
