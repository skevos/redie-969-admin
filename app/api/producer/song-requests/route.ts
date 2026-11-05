import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAdminSession, getProducerSession, jsonError, secretMissing } from '../../../lib/serverAuth';
import { getSessionSecret } from '../../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Listener song requests / dedications (table song_requests, written by the app).
// Readable by the dashboard admin AND by logged-in producers (producer-chat), never by the public.

async function session(req: NextRequest) {
  if (!getSessionSecret()) return { error: secretMissing() };
  const admin = await getAdminSession(req);
  if (admin) return { who: `admin:${admin.uid}` };
  const prod = await getProducerSession(req);
  if (prod) return { who: `producer:${prod.uid}` };
  return { error: jsonError('Unauthorized', 401) };
}

function missingTable(e: any) {
  const m = String(e?.message || '');
  return e?.code === '42P01' || e?.code === 'PGRST205' || /song_requests|requests_open/.test(m) && /does not exist|schema cache|column/i.test(m);
}

// GET -> { open, requests: [...new, last 24h], playedToday }
export async function GET(req: NextRequest) {
  const s = await session(req);
  if (s.error) return s.error;
  try {
    const db = getSupabaseAdmin();
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data, error } = await db.from('song_requests').select('id, song, for_name, from_name, message, status, created_at')
      .eq('status', 'new').gte('created_at', since).order('created_at', { ascending: true }).limit(100);
    if (error) return missingTable(error) ? NextResponse.json({ setupNeeded: true, open: false, requests: [] }) : jsonError(error.message, 500);
    const { count } = await db.from('song_requests').select('id', { count: 'exact', head: true }).eq('status', 'played').gte('created_at', since);
    const st = await db.from('settings').select('requests_open').eq('id', 1).maybeSingle();
    const open = st.error ? true : (st.data as any)?.requests_open !== false;
    return NextResponse.json({ open, requests: data || [], playedToday: count || 0 });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}

// POST { action: 'air' | 'played' | 'reject', id }  |  { action: 'open', open: boolean }  |  { action: 'stop_dedication', started_at }
export async function POST(req: NextRequest) {
  const s = await session(req);
  if (s.error) return s.error;
  let b: any;
  try { b = await req.json(); } catch { return jsonError('Invalid JSON', 400); }
  try {
    const db = getSupabaseAdmin();
    if (b?.action === 'open') {
      const { error } = await db.from('settings').update({ requests_open: !!b.open }).eq('id', 1);
      if (error) return jsonError(error.message, 400);
      return NextResponse.json({ ok: true });
    }
    if (b?.action === 'stop_dedication') {
      const { data } = await db.from('app_animations').select('id, settings, is_active').eq('type', 'dedication').limit(1).maybeSingle();
      const st: any = (data as any)?.settings || {};
      if (data && (data as any).is_active && (!b.started_at || st.started_at === b.started_at)) {
        await db.from('app_animations').update({ is_active: false }).eq('id', (data as any).id);
      }
      return NextResponse.json({ ok: true });
    }
    if (!['air', 'played', 'reject'].includes(b?.action) || !b?.id) return jsonError('Bad request', 400);
    const { data: r, error: rErr } = await db.from('song_requests').select('*').eq('id', b.id).maybeSingle();
    if (rErr) return jsonError(rErr.message, 500);
    if (!r) return jsonError('Not found', 404);
    const status = b.action === 'reject' ? 'rejected' : 'played';
    const { error } = await db.from('song_requests').update({ status, handled_at: new Date().toISOString(), handled_by: s.who }).eq('id', b.id);
    if (error) return jsonError(error.message, 400);
    let started_at: string | null = null;
    if (b.action === 'air') {
      // Show the dedication animation on every phone (app 1.0.9+)
      started_at = new Date().toISOString();
      const req: any = r;
      const message = [`🎵 ${req.song}`, req.message ? String(req.message) : ''].filter(Boolean).join(' — ');
      const settings = { to: req.for_name || 'όλους τους ακροατές', from: req.from_name || '', message, started_at, request_id: req.id };
      const { error: aErr } = await db.from('app_animations').update({ is_active: true, settings }).eq('type', 'dedication');
      if (aErr) return NextResponse.json({ ok: true, warning: 'Το αίτημα σημειώθηκε, αλλά το animation δεν ξεκίνησε: ' + aErr.message });
    }
    return NextResponse.json({ ok: true, started_at });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
