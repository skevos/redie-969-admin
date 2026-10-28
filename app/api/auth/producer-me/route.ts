import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getProducerSession } from '../../../lib/serverAuth';
import { PRODUCER_PUBLIC_COLUMNS } from '../../../lib/producerColumns';
import { PRODUCER_COOKIE, getSessionSecret, sessionCookieOptions } from '../../../lib/session';
import { jsonError, secretMissing } from '../../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!getSessionSecret()) return secretMissing();
  const s = await getProducerSession(req);
  if (!s) return jsonError('Unauthorized', 401);
  try {
    const { data } = await getSupabaseAdmin()
      .from('producers')
      .select(PRODUCER_PUBLIC_COLUMNS)
      .eq('id', s.uid)
      .eq('is_active', true)
      .maybeSingle();
    if (!data) {
      const res = jsonError('Unauthorized', 401);
      res.cookies.set(PRODUCER_COOKIE, '', sessionCookieOptions(0));
      return res;
    }
    return NextResponse.json(data);
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
