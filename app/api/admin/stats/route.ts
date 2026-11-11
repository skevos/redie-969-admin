import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { jsonError, requireAdmin } from '../../../lib/serverAuth';
import { RADIOCO_GROUPS, groupOf, radiocoImportToken } from '../../../lib/radioco';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 📈 Real statistics (no base, no boost) — GET ?days=7
// Sources: active_listeners (live, last_ping), listening_sessions (each finished listen: end time + seconds),
// app_daily_usage (opens per device per day), app_analytics (one row per device), app_sessions (city per device),
// shows, chat_messages, poll_votes, song_requests, song_likes, settings, presence_geo_boost.

const TZ = 'Europe/Athens';
const LIVE_WINDOW_MS = 90_000; // the app pings every 30″ while playing

type Interval = { s: number; e: number; d: string; p: string };

function athens(dt: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(dt);
  const g = (t: string) => parts.find(p => p.type === t)?.value || '';
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(g('weekday')); // 0 = Monday, like shows.day_of_week
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: Number(g('hour')), minute: Number(g('minute')), wd };
}

/** UTC ms for a wall-clock time in Athens. */
function athensToUtc(date: string, hhmm: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const a = athens(new Date(guess));
  const shown = Date.UTC(Number(a.date.slice(0, 4)), Number(a.date.slice(5, 7)) - 1, Number(a.date.slice(8, 10)), a.hour, a.minute);
  return guess - (shown - guess);
}

async function fetchAll<T = any>(build: (from: number, to: number) => any, cap = 50000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

function concurrencyPeak(iv: Interval[], from: number, to: number) {
  const ev: [number, number][] = [];
  for (const i of iv) {
    const s = Math.max(i.s, from), e = Math.min(i.e, to);
    if (e > s) { ev.push([s, 1]); ev.push([e, -1]); }
  }
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0, peak = 0, at = 0;
  for (const [t, d] of ev) { cur += d; if (cur > peak) { peak = cur; at = t; } }
  return { peak, at: at ? new Date(at).toISOString() : null };
}

export async function GET(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days')) || 7, 1), 90);
  const now = Date.now();
  const today = athens(new Date(now)).date;
  const sinceDate = athens(new Date(now - (days - 1) * 86400000)).date; // first Athens day in the period
  const since = athensToUtc(sinceDate, '00:00');
  const sinceIso = new Date(since).toISOString();

  try {
    const db = getSupabaseAdmin();

    // ---------- live ----------
    const [al, settingsRes, boostRes, presLive] = await Promise.all([
      fetchAll<any>((a, b) => db.from('active_listeners').select('device_id, last_ping').range(a, b)),
      db.from('settings').select('listener_count_base, show_listener_count').eq('id', 1).maybeSingle(),
      db.from('presence_geo_boost').select('city, country, boost_listeners, is_active'),
      db.from('presence_live').select('device_id, last_heartbeat'),
    ]);
    const liveDevices = al.filter(r => r.last_ping && now - new Date(r.last_ping).getTime() < LIVE_WINDOW_MS).map(r => r.device_id);
    const staleRows = al.length - liveDevices.length;
    const base = Number(settingsRes.data?.listener_count_base || 0);
    const boostRows = (boostRes.data || []).filter((b: any) => b.is_active);
    const boostTotal = boostRows.reduce((n: number, b: any) => n + Number(b.boost_listeners || 0), 0);
    const presenceLive = (presLive.data || []).filter((r: any) => r.last_heartbeat && now - new Date(r.last_heartbeat).getTime() < LIVE_WINDOW_MS).length;

    // city of each device = latest app_sessions row with a city
    const deviceCity = new Map<string, { city: string; country: string }>();
    const platformOf = new Map<string, string>();
    if (liveDevices.length) {
      for (let i = 0; i < liveDevices.length; i += 200) {
        const chunk = liveDevices.slice(i, i + 200);
        const { data } = await db.from('app_sessions').select('device_id, city, country, platform, started_at').in('device_id', chunk).not('city', 'is', null).order('started_at', { ascending: false }).limit(2000);
        for (const r of data || []) {
          if (!deviceCity.has(r.device_id)) deviceCity.set(r.device_id, { city: r.city, country: r.country });
          if (r.platform && !platformOf.has(r.device_id)) platformOf.set(r.device_id, r.platform);
        }
      }
    }
    const cityMap = new Map<string, { city: string; country: string; n: number }>();
    for (const d of liveDevices) {
      const c = deviceCity.get(d) || { city: 'Άγνωστη', country: '' };
      const k = `${c.country}|${c.city}`;
      const e = cityMap.get(k); if (e) e.n++; else cityMap.set(k, { ...c, n: 1 });
    }

    // ---------- listening intervals ----------
    const sessions = await fetchAll<any>((a, b) => db.from('listening_sessions').select('device_id, duration_seconds, platform, created_at').gte('created_at', sinceIso).order('created_at').range(a, b));
    const iv: Interval[] = sessions
      .filter(r => r.created_at && Number(r.duration_seconds) > 0)
      .map(r => { const e = new Date(r.created_at).getTime(); return { e, s: e - Number(r.duration_seconds) * 1000, d: r.device_id, p: r.platform || '' }; })
      .filter(i => i.e - i.s < 24 * 3600_000); // ignore broken > 24h entries
    const rawSessions = iv.length;
    // Some phones log overlapping sessions (the same listen saved twice): merge per device,
    // so one phone never counts as two listeners at the same moment.
    {
      const byDev = new Map<string, Interval[]>();
      for (const i of iv) (byDev.get(i.d) || byDev.set(i.d, []).get(i.d)!).push(i);
      iv.length = 0;
      for (const list of byDev.values()) {
        list.sort((x, y) => x.s - y.s);
        let cur = { ...list[0] };
        for (const i of list.slice(1)) {
          if (i.s <= cur.e + 60_000) cur.e = Math.max(cur.e, i.e); // overlapping or <1′ gap = same listen
          else { iv.push(cur); cur = { ...i }; }
        }
        iv.push(cur);
      }
    }

    const listeners = new Set(iv.map(i => i.d));
    const listenSec = iv.reduce((n, i) => n + (i.e - i.s) / 1000, 0);
    const peak = concurrencyPeak(iv, since, now);

    // per day (Athens)
    const dayKeys: string[] = [];
    for (let t = since + 12 * 3600_000; ; t += 86400000) { const d = athens(new Date(t)).date; if (d > today) break; if (!dayKeys.includes(d)) dayKeys.push(d); if (dayKeys.length > days + 1) break; }
    const daily = new Map(dayKeys.map(d => [d, { date: d, listeners: new Set<string>(), seconds: 0, sessions: 0, opens: 0, appUsers: 0, newInstalls: 0, chat: 0, votes: 0, requests: 0, likes: 0, peak: 0 }]));
    for (const i of iv) {
      const d = daily.get(athens(new Date(i.s)).date) || daily.get(athens(new Date(i.e)).date);
      if (d) { d.listeners.add(i.d); d.seconds += (i.e - i.s) / 1000; d.sessions++; }
    }
    for (const d of daily.values()) {
      const a = athensToUtc(d.date, '00:00');
      d.peak = concurrencyPeak(iv, a, a + 86400000).peak;
    }
    // hour-of-day profile: average concurrent listeners per hour (sampled every 5′)
    const hourSum = new Array(24).fill(0), hourCnt = new Array(24).fill(0);
    {
      const ev: [number, number][] = [];
      for (const i of iv) { ev.push([i.s, 1]); ev.push([i.e, -1]); }
      ev.sort((x, y) => x[0] - y[0]);
      let k = 0, cur = 0;
      const step = 5 * 60_000;
      // the Athens hour of a sample changes slowly: compute it once per sample but cheaply
      for (let t = since; t < now; t += step) {
        while (k < ev.length && ev[k][0] <= t) { cur += ev[k][1]; k++; }
        const h = athens(new Date(t)).hour;
        hourSum[h] += cur; hourCnt[h]++;
      }
    }
    const hourly = hourSum.map((v, h) => ({ hour: h, avg: hourCnt[h] ? Math.round((v / hourCnt[h]) * 10) / 10 : 0 }));

    // ---------- app usage ----------
    const [usage, devices] = await Promise.all([
      fetchAll<any>((a, b) => db.from('app_daily_usage').select('device_id, date, opens').gte('date', sinceDate).range(a, b)),
      fetchAll<any>((a, b) => db.from('app_analytics').select('device_id, platform, app_version, first_open, last_open').range(a, b)),
    ]);
    const appUsers = new Set<string>();
    let opens = 0;
    const usersPerDay = new Map<string, Set<string>>();
    for (const u of usage) {
      appUsers.add(u.device_id); opens += Number(u.opens || 1);
      const d = daily.get(String(u.date).slice(0, 10));
      if (d) { d.opens += Number(u.opens || 1); (usersPerDay.get(d.date) || usersPerDay.set(d.date, new Set()).get(d.date)!).add(u.device_id); }
    }
    for (const [k, set] of usersPerDay) daily.get(k)!.appUsers = set.size;
    let newInstalls = 0;
    for (const dv of devices) {
      if (!dv.first_open) continue;
      const t = new Date(dv.first_open).getTime();
      if (t >= since) { newInstalls++; const d = daily.get(athens(new Date(t)).date); if (d) d.newInstalls++; }
    }
    const active30 = devices.filter(d => d.last_open && now - new Date(d.last_open).getTime() < 30 * 86400000).length;
    const inactive14 = devices.filter(d => !d.last_open || now - new Date(d.last_open).getTime() >= 14 * 86400000).length;
    const verMap = new Map<string, number>();
    for (const d of devices.filter(d => d.last_open && now - new Date(d.last_open).getTime() < 30 * 86400000)) {
      const v = `${d.platform || '?'} ${d.app_version || 'παλιά (χωρίς έκδοση)'}`;
      verMap.set(v, (verMap.get(v) || 0) + 1);
    }

    // ---------- engagement ----------
    const [chat, votes, reqs, likes, pushCount] = await Promise.all([
      fetchAll<any>((a, b) => db.from('chat_messages').select('created_at, role_snapshot').gte('created_at', sinceIso).range(a, b)),
      fetchAll<any>((a, b) => db.from('poll_votes').select('created_at').gte('created_at', sinceIso).range(a, b)).catch(() => []),
      fetchAll<any>((a, b) => db.from('song_requests').select('created_at').gte('created_at', sinceIso).range(a, b)).catch(() => []),
      fetchAll<any>((a, b) => db.from('song_likes').select('created_at').gte('created_at', sinceIso).range(a, b)).catch(() => []),
      db.from('fcm_tokens').select('*', { count: 'exact', head: true }),
    ]);
    const bump = (rows: any[], key: 'chat' | 'votes' | 'requests' | 'likes') => {
      for (const r of rows) { const d = daily.get(athens(new Date(r.created_at)).date); if (d) d[key]++; }
    };
    // listeners' messages only (not producers / admin / automatic messages)
    const listenerChat = chat.filter((m: any) => !['producer', 'admin', 'owner', 'system', 'bot', 'auto'].includes(String(m.role_snapshot || '').toLowerCase()));
    bump(listenerChat, 'chat'); bump(votes, 'votes'); bump(reqs, 'requests'); bump(likes, 'likes');

    // ---------- uninstalls (estimate: phones that push reports as gone, logged by /api/send-notification) ----------
    let uninstalls: any = { setupNeeded: false, period: 0, total: 0, ios: 0, android: 0 };
    {
      const { data: un, error: unErr } = await db.from('push_uninstalls').select('detected_at, platform').order('detected_at', { ascending: false }).limit(20000);
      if (unErr) uninstalls.setupNeeded = true;
      else {
        uninstalls.total = (un || []).length;
        const inP = (un || []).filter((u: any) => new Date(u.detected_at).getTime() >= since);
        uninstalls.period = inP.length;
        uninstalls.ios = inP.filter((u: any) => u.platform === 'ios').length;
        uninstalls.android = inP.filter((u: any) => u.platform === 'android').length;
        uninstalls.last_at = un && un[0] ? un[0].detected_at : null;
        for (const u of inP) { const dd = daily.get(athens(new Date(u.detected_at)).date) as any; if (dd) dd.uninstalls = (dd.uninstalls || 0) + 1; }
      }
    }

    // ---------- Radio.co, all sources (imported with the bookmarklet) ----------
    const radioco: any = { setupNeeded: false, days: [], token: radiocoImportToken(), last_update: null };
    {
      const { data: rc, error: rcErr } = await db.from('radioco_daily').select('*').gte('day', sinceDate).order('day');
      if (rcErr) radioco.setupNeeded = true;
      else {
        const groups: Record<string, number> = {};
        const hours: Record<string, number> = {};
        let peak = 0, sessions = 0, bot = 0;
        for (const r of rc || []) {
          sessions += r.sessions || 0; bot += r.bot_sessions || 0; peak = Math.max(peak, r.peak || 0);
          for (const [c, n] of Object.entries(r.clients || {})) { const g = groupOf(c); groups[g] = (groups[g] || 0) + Number(n || 0); }
          for (const [reg, sec] of Object.entries(r.ttsl_by_region || {})) hours[reg] = (hours[reg] || 0) + Number(sec || 0) / 3600;
          if (!radioco.last_update || r.updated_at > radioco.last_update) radioco.last_update = r.updated_at;
          const gr = Number((r.ttsl_by_region || {}).GR || 0) / 3600;
          const tot = Object.values(r.ttsl_by_region || {}).reduce((a: number, b: any) => a + Number(b || 0), 0) / 3600;
          const de = Number((r.ttsl_by_region || {}).DE || 0) / 3600;
          radioco.days.push({ day: r.day, hours_gr: Math.round(gr * 10) / 10, hours_abroad: Math.round((tot - gr - de) * 10) / 10, real_sessions: (r.sessions || 0) - (r.bot_sessions || 0), peak: r.peak || 0 });
        }
        const round = (v: number) => Math.round(v * 10) / 10;
        radioco.sessions = sessions; radioco.bot_sessions = bot; radioco.real_sessions = sessions - bot; radioco.peak = peak;
        radioco.hours = Object.entries(hours).map(([region, h]) => ({ region, hours: round(h) })).sort((a, b) => b.hours - a.hours);
        radioco.groups = [...RADIOCO_GROUPS.map(g => ({ key: g.key, label: g.label, n: groups[g.key] || 0 })), { key: 'other', label: 'Άλλο', n: groups.other || 0 }].filter(g => g.n > 0);
      }
    }

    // ---------- per show ----------
    const { data: shows } = await db.from('shows').select('id, title, producer_name, day_of_week, start_time, end_time, is_active').order('day_of_week').order('start_time');
    const showStats = [];
    for (const sh of (shows || []).filter((x: any) => x.is_active !== false && x.start_time && x.end_time)) {
      const occ = [];
      for (const date of dayKeys) {
        const wd = athens(new Date(athensToUtc(date, '12:00'))).wd;
        if (wd !== Number(sh.day_of_week)) continue;
        const a = athensToUtc(date, String(sh.start_time).slice(0, 5));
        let b = athensToUtc(date, String(sh.end_time).slice(0, 5));
        if (b <= a) b += 86400000; // crosses midnight
        if (a > now) continue;
        const end = Math.min(b, now);
        const inside = iv.filter(i => i.s < end && i.e > a);
        let sum = 0, n = 0;
        for (let t = a; t < end; t += 60_000) { let c = 0; for (const i of inside) if (i.s <= t && i.e > t) c++; sum += c; n++; }
        const chatN = listenerChat.filter((m: any) => { const t = new Date(m.created_at).getTime(); return t >= a && t < end; }).length;
        occ.push({ date, avg: n ? Math.round((sum / n) * 10) / 10 : 0, peak: concurrencyPeak(inside, a, end).peak, unique: new Set(inside.map(i => i.d)).size, chat: chatN, partial: b > now });
      }
      const done = occ.filter(o => !o.partial);
      const base0 = done.length ? done : occ;
      showStats.push({
        id: sh.id, title: sh.title, producer: sh.producer_name, day_of_week: sh.day_of_week,
        start: String(sh.start_time).slice(0, 5), end: String(sh.end_time).slice(0, 5),
        occurrences: occ,
        avg: base0.length ? Math.round((base0.reduce((n, o) => n + o.avg, 0) / base0.length) * 10) / 10 : 0,
        peak: Math.max(0, ...occ.map(o => o.peak)),
        unique: base0.length ? Math.round(base0.reduce((n, o) => n + o.unique, 0) / base0.length) : 0,
        chat: occ.reduce((n, o) => n + o.chat, 0),
      });
    }

    return NextResponse.json({
      generated_at: new Date(now).toISOString(),
      days, since: sinceIso,
      live: {
        real: liveDevices.length,
        web: liveDevices.filter(d => String(d).startsWith('web-')).length,
        presence_real: presenceLive,
        stale_rows: staleRows,
        app_shows_public: (settingsRes.data?.show_listener_count === false) ? null : al.length + base,
        base, boost_total: boostTotal,
        boost_cities: boostRows.map((b: any) => ({ city: b.city, country: b.country, n: Number(b.boost_listeners || 0) })),
        ios: liveDevices.filter(d => platformOf.get(d) === 'ios').length,
        android: liveDevices.filter(d => platformOf.get(d) === 'android').length,
        cities: Array.from(cityMap.values()).sort((x, y) => y.n - x.n),
      },
      period: {
        unique_listeners: listeners.size,
        listen_hours: Math.round(listenSec / 360) / 10,
        avg_minutes: iv.length ? Math.round(listenSec / iv.length / 6) / 10 : 0,
        sessions: iv.length,
        raw_sessions: rawSessions,
        web_listeners: new Set(iv.filter(i => i.p === 'web').map(i => i.d)).size,
        ios_sessions: iv.filter(i => i.p === 'ios').length,
        android_sessions: iv.filter(i => i.p === 'android').length,
        peak: peak.peak, peak_at: peak.at,
        app_users: appUsers.size, app_opens: opens, new_installs: newInstalls,
      },
      daily: Array.from(daily.values()).map(d => ({ ...d, listeners: d.listeners.size, hours: Math.round(d.seconds / 360) / 10, seconds: undefined })),
      hourly,
      shows: showStats,
      audience: {
        installs: devices.length, active30, inactive14,
        ios: devices.filter(d => d.platform === 'ios').length,
        android: devices.filter(d => d.platform === 'android').length,
        push_devices: pushCount.count || 0,
        uninstalls,
        versions: Array.from(verMap.entries()).map(([v, n]) => ({ v, n })).sort((a, b) => b.n - a.n),
      },
      radioco,
      engagement: {
        chat: listenerChat.length, votes: votes.length, requests: reqs.length, likes: likes.length,
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
