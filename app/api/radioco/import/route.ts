import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { checkRadiocoToken } from '../../../lib/radioco';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Receives daily Radio.co statistics from the bookmarklet running on studio.radio.co.
// Body (text/plain JSON, so the browser sends it without a CORS preflight):
// { token, days: [{ day:'YYYY-MM-DD', sessions, unknown, peak, unique, ttsl_by_region:{GR:sec,...}, clients:{name:n} }] }
const CORS = { 'Access-Control-Allow-Origin': 'https://studio.radio.co', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(req: NextRequest) {
  let body: any;
  try { body = JSON.parse(await req.text()); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400, headers: CORS }); }
  if (!checkRadiocoToken(body?.token)) return NextResponse.json({ error: 'Λάθος ή παλιός σελιδοδείκτης — πάρτε νέο από τα Στατιστικά.' }, { status: 401, headers: CORS });
  const days = Array.isArray(body?.days) ? body.days.slice(0, 400) : [];
  const rows = days.filter((d: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(d?.day))).map((d: any) => ({
    day: d.day,
    sessions: Math.max(0, Math.round(Number(d.sessions) || 0)),
    bot_sessions: Math.max(0, Math.round(Number(d.unknown) || 0)),
    peak: Math.max(0, Math.round(Number(d.peak) || 0)),
    unique_listeners: Math.max(0, Math.round(Number(d.unique) || 0)),
    ttsl_by_region: typeof d.ttsl_by_region === 'object' && d.ttsl_by_region ? d.ttsl_by_region : {},
    clients: typeof d.clients === 'object' && d.clients ? d.clients : {},
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return NextResponse.json({ error: 'Δεν βρέθηκαν δεδομένα' }, { status: 400, headers: CORS });
  const { error } = await getSupabaseAdmin().from('radioco_daily').upsert(rows, { onConflict: 'day' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json({ ok: true, days: rows.length, from: rows[0].day, to: rows[rows.length - 1].day }, { headers: CORS });
}
