import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { jsonError, requireAdmin } from '../../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dashboard writes go through here (service role + admin session) instead of the public anon key.
// Body: { table, op: 'insert'|'update'|'delete'|'upsert', values?, filters?: [[method, ...args]], select?, single?, onConflict? }
const TABLES = new Set([
  'shows', 'show_sponsors', 'settings', 'splash_config', 'app_animations',
  'presence_moments', 'presence_geo_boost',
  'chat_sponsored_messages', 'chat_messages', 'chat_reports', 'chat_rooms', 'chat_config', 'chat_archives',
  'app_notifications', 'fcm_tokens', 'polls', 'poll_votes', 'song_requests',
]);
const OPS = new Set(['insert', 'update', 'delete', 'upsert']);
const FILTERS = new Set(['eq', 'neq', 'in', 'or', 'is', 'gt', 'gte', 'lt', 'lte']);
const IDENT = /^[a-z_][a-z0-9_]*$/;

export async function POST(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  let body: any;
  try { body = await req.json(); } catch { return jsonError('Bad JSON', 400); }
  const { table, op, values, filters = [], select, single, onConflict } = body || {};
  if (!TABLES.has(table)) return jsonError(`Table not allowed: ${table}`, 403);
  if (!OPS.has(op)) return jsonError(`Operation not allowed: ${op}`, 400);
  if (!Array.isArray(filters)) return jsonError('Bad filters', 400);
  // update / delete without any filter would touch every row: refuse, like supabase-js does
  if ((op === 'update' || op === 'delete') && filters.length === 0) return jsonError('Filter required', 400);

  try {
    const db = getSupabaseAdmin();
    let q: any = db.from(table);
    if (op === 'insert') q = q.insert(values);
    else if (op === 'upsert') q = q.upsert(values, onConflict ? { onConflict } : undefined);
    else if (op === 'update') q = q.update(values);
    else q = q.delete();
    for (const f of filters) {
      if (!Array.isArray(f) || !FILTERS.has(f[0])) return jsonError('Bad filter', 400);
      const [m, col, ...rest] = f;
      if (m !== 'or' && (typeof col !== 'string' || !IDENT.test(col))) return jsonError('Bad column', 400);
      q = q[m](col, ...rest);
    }
    if (select) q = q.select(typeof select === 'string' ? select : '*');
    if (single) q = q.single();
    const { data, error } = await q;
    if (error) return NextResponse.json({ data: null, error: { message: error.message, code: error.code } }, { status: 200 });
    return NextResponse.json({ data: data ?? null, error: null });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
