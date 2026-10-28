// Server-only auth helpers for route handlers.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabaseAdmin';
import {
  ADMIN_COOKIE,
  PRODUCER_COOKIE,
  getSessionSecret,
  verifySessionToken,
  VerifiedSession,
} from './session';

export const GENERIC_LOGIN_ERROR = 'Λάθος στοιχεία σύνδεσης';

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function secretMissing() {
  return jsonError('SESSION_SECRET missing', 500);
}

export async function getAdminSession(req: NextRequest): Promise<VerifiedSession | null> {
  const s = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
  return s && s.kind === 'admin' ? s : null;
}

export async function getProducerSession(req: NextRequest): Promise<VerifiedSession | null> {
  const s = await verifySessionToken(req.cookies.get(PRODUCER_COOKIE)?.value);
  return s && s.kind === 'producer' ? s : null;
}

// Any dashboard session (owner/admin/producer role). Returns a NextResponse on failure.
export async function requireAdmin(req: NextRequest): Promise<VerifiedSession | NextResponse> {
  if (!getSessionSecret()) return secretMissing();
  const s = await getAdminSession(req);
  if (!s) return jsonError('Unauthorized', 401);
  return s;
}

export async function requireOwner(req: NextRequest): Promise<VerifiedSession | NextResponse> {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  if (s.role !== 'owner') return jsonError('Forbidden', 403);
  return s;
}

// Audit logging (best effort; table may not exist)
export async function logAudit(userId: string | null, action: string, details?: any): Promise<void> {
  try {
    await getSupabaseAdmin().from('audit_logs').insert({ user_id: userId, action, details });
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

// ---------------------------------------------------------------------------
// Producer time window (moved from app/lib/auth.ts, unchanged logic).
// shows.day_of_week is an integer 0=Monday … 6=Sunday, evaluated in Athens time.
// ---------------------------------------------------------------------------
const DAY_NAMES = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];

export async function checkProducerTimeWindow(producerId?: string | null): Promise<{ allowed: boolean; reason?: string; showInfo?: any }> {
  if (!producerId) {
    return { allowed: false, reason: 'Δεν έχετε συνδεδεμένη εκπομπή' };
  }

  try {
    const { data: shows } = await getSupabaseAdmin()
      .from('shows')
      .select('*')
      .eq('producer_id', producerId);

    if (!shows || shows.length === 0) {
      return { allowed: false, reason: 'Δεν έχετε προγραμματισμένη εκπομπή' };
    }

    const now = new Date();
    const { day: currentDay, minutes: currentMinutes } = getAthensDayAndMinutes(now);
    const yesterday = (currentDay + 6) % 7;
    const tomorrow = (currentDay + 1) % 7;

    for (const show of shows) {
      const day = Number(show.day_of_week);
      const offsets: number[] = [];
      if (day === currentDay) offsets.push(0);
      if (day === yesterday) offsets.push(1440);
      if (day === tomorrow) offsets.push(-1440);
      if (offsets.length === 0) continue;

      const startTime = String(show.start_time).slice(0, 5);
      const endTime = String(show.end_time).slice(0, 5);
      const start = timeToMinutes(startTime);
      let end = timeToMinutes(endTime);
      if (end <= start) end += 1440;

      const windowStart = start - 15;
      const windowEnd = end + 5;

      if (offsets.some(o => currentMinutes + o >= windowStart && currentMinutes + o <= windowEnd)) {
        return { allowed: true, showInfo: { title: show.title, start: startTime, end: endTime } };
      }
    }

    const nextShow = findNextShow(shows, now);
    if (nextShow) {
      return {
        allowed: false,
        reason: `Η πρόσβαση ανοίγει 15 λεπτά πριν την εκπομπή σου (${DAY_NAMES[Number(nextShow.day_of_week)] ?? ''} ${String(nextShow.start_time).slice(0, 5)})`,
      };
    }

    return { allowed: false, reason: 'Δεν έχετε προγραμματισμένη εκπομπή σήμερα' };
  } catch {
    return { allowed: false, reason: 'Σφάλμα ελέγχου προγράμματος' };
  }
}

function getAthensDayAndMinutes(now: Date): { day: number; minutes: number; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const jsDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const jsDay = Math.max(0, jsDays.indexOf(get('weekday')));
  const h = parseInt(get('hour'), 10) % 24;
  const m = parseInt(get('minute'), 10);
  return {
    day: (jsDay + 6) % 7,
    minutes: h * 60 + m,
    time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
  };
}

function timeToMinutes(time: string): number {
  const [h, m] = String(time).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function findNextShow(shows: any[], now: Date): any {
  const { day: currentDayIndex, time: currentTime } = getAthensDayAndMinutes(now);
  for (let i = 0; i < 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const dayShows = shows.filter(s => Number(s.day_of_week) === dayIndex);
    for (const show of dayShows.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))) {
      if (i === 0) {
        if (String(show.start_time).slice(0, 5) > currentTime) return show;
      } else {
        return show;
      }
    }
  }
  return null;
}
