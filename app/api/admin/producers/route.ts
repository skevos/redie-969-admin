import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { jsonError, logAudit, requireAdmin } from '../../../lib/serverAuth';
import { PRODUCER_PUBLIC_COLUMNS } from '../../../lib/producerColumns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The producers table is read by the mobile app with the public anon key. Producers marked
// hidden_in_app are filtered out for anon by a restrictive RLS policy, so the dashboard reads and
// writes producers here with the service role (admin session required) and still sees all of them.

const FIELDS = ['name', 'bio', 'photo_url', 'is_admin', 'is_active', 'show_1', 'show_2', 'chat_color', 'chat_icon', 'hidden_in_app'];

function pick(data: any) {
  const out: Record<string, any> = {};
  for (const k of FIELDS) if (data && k in data) out[k] = data[k];
  return out;
}

function missingHiddenColumn(error: any) {
  return !!error && /hidden_in_app/.test(String(error.message || ''));
}

// GET -> { producers: [...] } (all producers, including the ones hidden in the app)
export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  try {
    const db = getSupabaseAdmin();
    let res: any = await db.from('producers').select(`${PRODUCER_PUBLIC_COLUMNS}, hidden_in_app`).order('name');
    if (missingHiddenColumn(res.error)) res = await db.from('producers').select(PRODUCER_PUBLIC_COLUMNS).order('name');
    if (res.error) return jsonError(res.error.message, 500);
    return NextResponse.json({ producers: res.data || [] });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}

// POST { op: 'insert', data } | { op: 'update', id, data } | { op: 'delete', id }
export async function POST(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  let b: any;
  try { b = await req.json(); } catch { return jsonError('Invalid JSON', 400); }
  try {
    const db = getSupabaseAdmin();
    if (b?.op === 'insert') {
      const data = pick(b.data);
      if (!String(data.name || '').trim()) return jsonError('Το όνομα είναι υποχρεωτικό', 400);
      let res: any = await db.from('producers').insert(data).select('id').single();
      if (missingHiddenColumn(res.error)) { delete data.hidden_in_app; res = await db.from('producers').insert(data).select('id').single(); }
      if (res.error) return jsonError(res.error.message, 400);
      await logAudit(s.uid, 'producer_created', { id: res.data?.id });
      return NextResponse.json({ ok: true, id: res.data?.id });
    }
    if (b?.op === 'update') {
      if (!b.id) return jsonError('Missing id', 400);
      const data = pick(b.data);
      let res: any = await db.from('producers').update(data).eq('id', b.id).select('id');
      if (missingHiddenColumn(res.error)) {
        if ('hidden_in_app' in data) return jsonError('Λείπει η στήλη hidden_in_app — τρέξε πρώτα το SQL', 400);
        res = await db.from('producers').update(data).eq('id', b.id).select('id');
      }
      if (res.error) return jsonError(res.error.message, 400);
      if (!res.data?.length) return jsonError('Not found', 404);
      await logAudit(s.uid, 'producer_updated', { id: b.id, fields: Object.keys(data) });
      return NextResponse.json({ ok: true });
    }
    if (b?.op === 'delete') {
      if (!b.id) return jsonError('Missing id', 400);
      const { error } = await db.from('producers').delete().eq('id', b.id);
      if (error) return jsonError(error.message, 400);
      await logAudit(s.uid, 'producer_deleted', { id: b.id });
      return NextResponse.json({ ok: true });
    }
    return jsonError('Unknown op', 400);
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
