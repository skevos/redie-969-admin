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
// Read-only through here (closed to the public key, phase 2b)
const READ_TABLES = new Set([...TABLES, 'app_analytics', 'listening_sessions', 'app_sessions', 'app_session_places', 'moment_wins']);
const OPS = new Set(['insert', 'update', 'delete', 'upsert', 'select']);
const FILTERS = new Set(['eq', 'neq', 'in', 'or', 'is', 'gt', 'gte', 'lt', 'lte']);
const IDENT = /^[a-z_][a-z0-9_]*$/;

export async function POST(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  let body: any;
  try { body = await req.json(); } catch { return jsonError('Bad JSON', 400); }
  const { table, op, values, filters = [], select, single, onConflict, count, head, order = [], range, limit, maybeSingle } = body || {};
  if (!(op === 'select' ? READ_TABLES : TABLES).has(table)) return jsonError(`Table not allowed: ${table}`, 403);
  if (!OPS.has(op)) return jsonError(`Operation not allowed: ${op}`, 400);
  if (!Array.isArray(filters)) return jsonError('Bad filters', 400);
  // update / delete without any filter would touch every row: refuse, like supabase-js does
  if ((op === 'update' || op === 'delete') && filters.length === 0) return jsonError('Filter required', 400);

  try {
    const db = getSupabaseAdmin();
    let q: any = db.from(table);
    if (op === 'select') q = q.select(typeof select === 'string' ? select : '*', { count: count === 'exact' ? 'exact' : undefined, head: !!head });
    else if (op === 'insert') q = q.insert(values);
    else if (op === 'upsert') q = q.upsert(values, onConflict ? { onConflict } : undefined);
    else if (op === 'update') q = q.update(values);
    else q = q.delete();
    for (const f of filters) {
      if (!Array.isArray(f) || !FILTERS.has(f[0])) return jsonError('Bad filter', 400);
      const [m, col, ...rest] = f;
      if (m !== 'or' && (typeof col !== 'string' || !IDENT.test(col))) return jsonError('Bad column', 400);
      q = q[m](col, ...rest);
    }
    if (op === 'select') {
      if (!Array.isArray(order)) return jsonError('Bad order', 400);
      for (const o of order) {
        if (!Array.isArray(o) || typeof o[0] !== 'string' || !IDENT.test(o[0])) return jsonError('Bad order', 400);
        q = q.order(o[0], { ascending: o[1] !== false });
      }
      if (Array.isArray(range) && range.length === 2) q = q.range(Number(range[0]), Number(range[1]));
      else if (limit) q = q.limit(Math.min(Number(limit), 1000));
      if (maybeSingle) q = q.maybeSingle();
    } else if (select) q = q.select(typeof select === 'string' ? select : '*');
    if (single) q = q.single();
    const { data, error, count: total } = await q;
    if (error) return NextResponse.json({ data: null, count: null, error: { message: error.message, code: error.code } }, { status: 200 });
    return NextResponse.json({ data: data ?? null, count: total ?? null, error: null });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
