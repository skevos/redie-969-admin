import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAdmin, jsonError } from '../../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  try {
    const { data: user } = await getSupabaseAdmin()
      .from('dashboard_users')
      .select('id, username, display_name, role, producer_id, is_active')
      .eq('id', s.uid)
      .eq('is_active', true)
      .maybeSingle();
    if (!user) return jsonError('Unauthorized', 401);
    return NextResponse.json({ user });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
