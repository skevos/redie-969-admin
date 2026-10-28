import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { hashPassword } from '../../../lib/password';
import { jsonError, logAudit, requireOwner } from '../../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_USER_COLUMNS = 'id, username, display_name, role, producer_id, is_active, failed_login_attempts, locked_until, last_login, created_at';
const ROLES = ['owner', 'admin', 'producer'];

async function readBody(req: NextRequest): Promise<any> {
  try { return await req.json(); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const s = await requireOwner(req);
  if (s instanceof NextResponse) return s;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('dashboard_users')
      .select(PUBLIC_USER_COLUMNS)
      .order('created_at', { ascending: false });
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ users: data || [] });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}

export async function POST(req: NextRequest) {
  const s = await requireOwner(req);
  if (s instanceof NextResponse) return s;
  const b = await readBody(req);
  const username = typeof b?.username === 'string' ? b.username.toLowerCase().trim() : '';
  const password = typeof b?.password === 'string' ? b.password : '';
  const role = typeof b?.role === 'string' ? b.role : 'producer';
  if (!username || !password) return jsonError('Username και password είναι υποχρεωτικά', 400);
  if (!ROLES.includes(role)) return jsonError('Invalid role', 400);
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('dashboard_users')
      .insert({
        username,
        password_hash: await hashPassword(password),
        display_name: typeof b?.display_name === 'string' ? b.display_name : username,
        role,
        producer_id: role === 'producer' ? b?.producer_id || null : null,
        is_active: b?.is_active !== false,
      })
      .select(PUBLIC_USER_COLUMNS)
      .single();
    if (error) return jsonError(error.message, 400);
    await logAudit(s.uid, 'user_created', { id: data?.id, username, role });
    return NextResponse.json({ user: data });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}

export async function PATCH(req: NextRequest) {
  const s = await requireOwner(req);
  if (s instanceof NextResponse) return s;
  const b = await readBody(req);
  if (!b?.id) return jsonError('Missing id', 400);
  const update: Record<string, any> = {};
  if (typeof b.display_name === 'string') update.display_name = b.display_name;
  if (typeof b.role === 'string') {
    if (!ROLES.includes(b.role)) return jsonError('Invalid role', 400);
    update.role = b.role;
  }
  if ('producer_id' in b) update.producer_id = b.producer_id || null;
  if (typeof b.is_active === 'boolean') update.is_active = b.is_active;
  if (typeof b.password === 'string' && b.password) {
    update.password_hash = await hashPassword(b.password);
    update.failed_login_attempts = 0;
    update.locked_until = null;
  }
  if (Object.keys(update).length === 0) return jsonError('Nothing to update', 400);
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('dashboard_users')
      .update(update)
      .eq('id', b.id)
      .select(PUBLIC_USER_COLUMNS)
      .maybeSingle();
    if (error) return jsonError(error.message, 400);
    if (!data) return jsonError('Not found', 404);
    await logAudit(s.uid, 'user_updated', { id: b.id, fields: Object.keys(update).filter(k => k !== 'password_hash'), password_changed: !!update.password_hash });
    return NextResponse.json({ user: data });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}

export async function DELETE(req: NextRequest) {
  const s = await requireOwner(req);
  if (s instanceof NextResponse) return s;
  const b = await readBody(req);
  const id = b?.id || req.nextUrl.searchParams.get('id');
  if (!id) return jsonError('Missing id', 400);
  if (id === s.uid) return jsonError('Δεν μπορείτε να διαγράψετε τον εαυτό σας', 400);
  try {
    const { error } = await getSupabaseAdmin().from('dashboard_users').delete().eq('id', id);
    if (error) return jsonError(error.message, 400);
    await logAudit(s.uid, 'user_deleted', { id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
