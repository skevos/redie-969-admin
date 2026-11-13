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

// Form columns (redie_forms.sql). Before that SQL runs, fall back to the old columns.
const BASE_COLS = 'id, song, for_name, from_name, message, status, created_at';
const FORM_COLS = BASE_COLS + ', form_id, answers, needs_review';
const noFormCols = (e: any) => /form_id|answers|needs_review/.test(String(e?.message || ''));

async function newRequests(db: any, since: string, review: boolean) {
  const q = (cols: string, withReview: boolean) => {
    let x = db.from('song_requests').select(cols).eq('status', 'new').gte('created_at', since);
    if (withReview) x = x.eq('needs_review', review);
    return x.order('created_at', { ascending: true }).limit(100);
  };
  const r = await q(FORM_COLS, true);
  if (r.error && noFormCols(r.error)) return review ? { data: [], error: null } : await q(BASE_COLS, false);
  return r;
}

// Card on every phone (app_animations type 'form_card'), cleaned up before it is stored
function cleanCard(c: any) {
  const hex = (v: any, d: string) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : d);
  const str = (v: any) => String(v ?? '').slice(0, 200);
  const colors = Array.isArray(c?.colors) ? c.colors.slice(0, 4).map((x: any) => hex(x, '#F02828')) : ['#7A0F2A', '#F02828', '#FF8A3D'];
  const duration = Math.min(Math.max(Number(c?.duration) || 15, 5), 120);
  return { colors, text: hex(c?.text, '#FFFFFF'), label: str(c?.label), title: str(c?.title), subtitle: str(c?.subtitle), message: str(c?.message), footer: str(c?.footer), duration };
}

// GET -> { open, requests: [...new, last 24h], playedToday }
export async function GET(req: NextRequest) {
  const s = await session(req);
  if (s.error) return s.error;
  try {
    const db = getSupabaseAdmin();
    // History view for the Αιτήματα page: every request (any status) of the last N days
    if (req.nextUrl.searchParams.get('view') === 'history') {
      const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days')) || 30, 1), 3650);
      const from = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
      const { data, error } = await db.from('song_requests')
        .select('id, song, for_name, from_name, message, status, created_at, handled_at, handled_by')
        .gte('created_at', from).order('created_at', { ascending: false }).limit(5000);
      if (error) return missingTable(error) ? NextResponse.json({ setupNeeded: true, open: false, requests: [] }) : jsonError(error.message, 500);
      // Producer names for handled_by = "producer:<id>"
      const ids = Array.from(new Set((data || []).map((r: any) => String(r.handled_by || '')).filter(x => x.startsWith('producer:')).map(x => x.slice(9))));
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: prods } = await db.from('producers').select('id, name').in('id', ids);
        (prods || []).forEach((p: any) => { names[`producer:${p.id}`] = p.name; });
      }
      const st = await db.from('settings').select('requests_open').eq('id', 1).maybeSingle();
      const open = st.error ? true : (st.data as any)?.requests_open !== false;
      return NextResponse.json({
        open,
        requests: (data || []).map((r: any) => ({ ...r, handled_by_name: r.handled_by ? (names[r.handled_by] || (String(r.handled_by).startsWith('admin') ? 'Dashboard' : '')) : '' })),
      });
    }
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    // 📝 Φόρμες & Αιτήματα inbox (admin only): waiting for the admin + already with the producers
    if (req.nextUrl.searchParams.get('view') === 'inbox') {
      if (!String(s.who).startsWith('admin')) return jsonError('Forbidden', 403);
      const week = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const p = await newRequests(db, week, true);
      const n = await newRequests(db, since, false);
      if (n.error) return missingTable(n.error) ? NextResponse.json({ setupNeeded: true, pending: [], sent: [] }) : jsonError(n.error.message, 500);
      return NextResponse.json({ pending: (p.data || []).reverse(), sent: (n.data || []).reverse(), setupNeeded: !!(p.error) });
    }
    const { data, error } = await newRequests(db, since, false);
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
    if (b?.action === 'card_stop') {
      await db.from('app_animations').update({ is_active: false }).eq('type', 'form_card');
      return NextResponse.json({ ok: true });
    }
    if (b?.action === 'card') {
      const settings = { ...cleanCard(b.settings), started_at: new Date().toISOString(), request_id: b.id ?? null };
      const { data: up, error } = await db.from('app_animations').update({ is_active: true, settings }).eq('type', 'form_card').select('id');
      if (error) return jsonError(error.message, 400);
      if (!up || up.length === 0) return jsonError('Λείπει το SQL για τις φόρμες (redie_forms.sql)', 400);
      return NextResponse.json({ ok: true, started_at: settings.started_at });
    }
    if (b?.action === 'approve') {
      if (!String(s.who).startsWith('admin')) return jsonError('Forbidden', 403);
      if (!b?.id) return jsonError('Bad request', 400);
      const { error } = await db.from('song_requests').update({ needs_review: false }).eq('id', b.id);
      if (error) return jsonError(error.message, 400);
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
