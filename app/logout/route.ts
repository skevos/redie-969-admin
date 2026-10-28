import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, sessionCookieOptions } from '../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /logout -> clear admin session and go to /login
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', req.url), 303);
  res.cookies.set(ADMIN_COOKIE, '', sessionCookieOptions(0));
  return res;
}
