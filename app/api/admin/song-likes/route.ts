import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { jsonError, requireAdmin } from '../../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ❤️ likes from the app (public.song_likes). GET ?days=7 -> { total, top: [{ title, likes }] }
export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days')) || 7, 1), 3650);
  try {
    const db = getSupabaseAdmin();
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await db.from('song_likes').select('title').gte('created_at', since).limit(20000);
    if (error) {
      const m = String(error.message || '');
      if (error.code === '42P01' || error.code === 'PGRST205' || /song_likes/.test(m)) return NextResponse.json({ setupNeeded: true, total: 0, top: [] });
      return jsonError(m, 500);
    }
    const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    const map = new Map<string, { title: string; likes: number }>();
    for (const r of data || []) {
      const t = String((r as any).title || '').trim();
      if (!t) continue;
      const k = norm(t);
      const e = map.get(k);
      if (e) e.likes++; else map.set(k, { title: t, likes: 1 });
    }
    const top = Array.from(map.values()).sort((a, b) => b.likes - a.likes).slice(0, 20);
    return NextResponse.json({ total: (data || []).length, top });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
