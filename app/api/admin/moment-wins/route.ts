import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { jsonError, requireAdmin } from '../../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 🎁 Moments: winners of one moment (moment_wins is closed to the public key)
export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError('Bad id', 400);
  const { data, error } = await getSupabaseAdmin()
    .from('moment_wins')
    .select('claim_no, code, created_at, device_id')
    .eq('moment_id', id)
    .order('claim_no', { ascending: true })
    .limit(1000);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ wins: (data || []).map(w => ({ ...w, device_id: String(w.device_id).slice(-6) })) });
}
