import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, getSessionSecret, safeEqual, verifySessionToken } from './app/lib/session';

// Next.js 16: `proxy.ts` (formerly middleware.ts). Runs on the Node.js runtime.

const STATIC_EXT = /\.(png|jpe?g|gif|svg|ico|html|txt|webp|xml|webmanifest|css|js|map|woff2?|ttf)$/i;

function isPublic(pathname: string): boolean {
  if (STATIC_EXT.test(pathname)) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  for (const p of ['/login', '/logout', '/app', '/producer-chat']) {
    if (pathname === p || pathname.startsWith(p + '/')) return true;
  }
  return false;
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

let warned = false;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const secret = getSessionSecret();
  if (!secret) {
    // FAIL-OPEN: do not lock the owner out if the env var has not been added yet.
    if (!warned) {
      console.warn('[auth] SESSION_SECRET is not set — dashboard is NOT protected. Add it on Vercel.');
      warned = true;
    }
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
  const isAdmin = !!session && session.kind === 'admin';
  const internalOk = safeEqual(request.headers.get('x-internal-secret'), secret);

  if (pathname === '/api/send-notification' || pathname.startsWith('/api/send-notification/')) {
    return isAdmin || internalOk ? NextResponse.next() : unauthorized();
  }

  if (pathname === '/api/auto-chat' || pathname.startsWith('/api/auto-chat/')) {
    const cron = process.env.CRON_SECRET;
    const cronOk = !!cron && safeEqual(request.headers.get('authorization'), `Bearer ${cron}`);
    return isAdmin || internalOk || cronOk ? NextResponse.next() : unauthorized();
  }

  if (isAdmin) return NextResponse.next();

  if (pathname.startsWith('/api/')) return unauthorized();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
