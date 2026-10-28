import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, PRODUCER_COOKIE, sessionCookieOptions } from '../../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/auth/logout            -> clears admin cookie
// POST /api/auth/logout?kind=producer -> clears producer-chat cookie
// POST /api/auth/logout?kind=all   -> clears both
export async function POST(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind');
  const res = NextResponse.json({ ok: true });
  if (kind !== 'producer') res.cookies.set(ADMIN_COOKIE, '', sessionCookieOptions(0));
  if (kind === 'producer' || kind === 'all') res.cookies.set(PRODUCER_COOKIE, '', sessionCookieOptions(0));
  return res;
}
