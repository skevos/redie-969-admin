import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requireAdmin } from '../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Current Radio.co track, for the live preview in App Content (the app fetches Radio.co itself).
const STATUS_URL = 'https://public.radio.co/stations/s11d4ceafa/status';

export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  try {
    const r = await fetch(STATUS_URL, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return jsonError(`Radio.co HTTP ${r.status}`, 502);
    const j: any = await r.json();
    return NextResponse.json({
      status: j?.status || '',
      source: j?.source?.type || '',
      title: String(j?.current_track?.title || '').trim(),
      artwork: j?.current_track?.artwork_url || '',
      started: j?.current_track?.start_time || '',
      history: (j?.history || []).slice(0, 5).map((h: any) => String(h?.title || '').trim()).filter(Boolean),
    });
  } catch (e: any) {
    return jsonError(e?.message || 'Radio.co unreachable', 502);
  }
}
