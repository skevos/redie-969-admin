import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { hashPassword } from '../../../../lib/password';
import { jsonError, logAudit, requireAdmin } from '../../../../lib/serverAuth';

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
      const { data, error } = await db.from('producers').select('username').eq('id', id).maybeSingle();
      if (error) return jsonError(error.message, 400);
      if (!data) return jsonError('Not found', 404);
      return NextResponse.json({ username: data.username ?? null });
    }
    const { data, error } = await db.from('producers').select('id, username');
    if (error) return jsonError(error.message, 400);
    const usernames: Record<string, string | null> = {};
    (data || []).forEach((r: any) => { usernames[String(r.id)] = r.username ?? null; });
    return NextResponse.json({ usernames });
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
    const { data, error } = await getSupabaseAdmin()
      .from('producers')
      .update(update)
      .eq('id', b.id)
      .select('id')
      .maybeSingle();
    if (error) return jsonError(error.message, 400);
    if (!data) return jsonError('Not found', 404);
    await logAudit(s.uid, 'producer_credentials_updated', { id: b.id, username: 'username' in update, password: 'password' in update });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
