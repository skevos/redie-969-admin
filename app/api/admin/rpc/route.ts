import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { jsonError, requireAdmin } from '../../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dashboard-only database functions, run with the service role (they read tables the public key can't).
const ALLOWED = new Set(['get_presence_geo_boosted', 'get_presence_dashboard_stats']);

export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  const name = req.nextUrl.searchParams.get('name') || '';
  if (!ALLOWED.has(name)) return jsonError('Function not allowed', 403);
  const { data, error } = await getSupabaseAdmin().rpc(name);
  if (error) return NextResponse.json({ data: null, error: { message: error.message } });
  return NextResponse.json({ data, error: null });
}
