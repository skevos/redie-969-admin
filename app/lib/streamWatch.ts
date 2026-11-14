import { getSupabaseAdmin } from './supabaseAdmin';

// 📡 Stream watch: runs every minute with the auto-chat cron.
// Records every time Radio.co stops playing the studio (live) and plays its own playlist instead.
//  - 'fallback': caught while it was happening (source is not live)
//  - 'dip': a short one between two checks, found in Radio.co's history as A → X → A
//    (the studio song, a server song, the same studio song again when the live came back)
const STATUS_URL = 'https://public.radio.co/stations/s11d4ceafa/status';

const clean = (t: any) => String(t?.title ?? t ?? '').trim();

export async function watchStream(): Promise<void> {
  const db = getSupabaseAdmin();
  const r = await fetch(STATUS_URL, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
  if (!r.ok) return;
  const j: any = await r.json();
  const sourceType = String(j?.source?.type || '');
  const live = sourceType === 'live';
  const nowTitle = clean(j?.current_track);
  const history: string[] = (Array.isArray(j?.history) ? j.history : []).map(clean).filter(Boolean).slice(0, 15);

  const { data: st, error: stErr } = await db.from('stream_watch').select('*').eq('id', 1).maybeSingle();
  if (stErr) return; // SQL not run yet
  const state: any = st || { id: 1, open_event_id: null, seen_keys: [] };
  const now = new Date().toISOString();

  // 1) Caught while it happens
  if (!live && !state.open_event_id) {
    const { data: ev } = await db.from('stream_events').insert({
      kind: 'fallback', started_at: now, fallback_title: nowTitle || null, detail: { source: sourceType },
    }).select('id').single();
    state.open_event_id = ev?.id ?? null;
  } else if (!live && state.open_event_id) {
    // still on the server: keep the list of songs it played
    const { data: ev } = await db.from('stream_events').select('detail').eq('id', state.open_event_id).maybeSingle();
    const titles: string[] = Array.isArray((ev as any)?.detail?.titles) ? (ev as any).detail.titles : [];
    if (nowTitle && !titles.includes(nowTitle)) {
      await db.from('stream_events').update({ detail: { source: sourceType, titles: [...titles, nowTitle].slice(-20) } }).eq('id', state.open_event_id);
    }
  } else if (live && state.open_event_id) {
    await db.from('stream_events').update({ ended_at: now }).eq('id', state.open_event_id);
    state.open_event_id = null;
  }

  // 2) Short ones between checks: A, X, A in the history (newest first)
  const seen: string[] = Array.isArray(state.seen_keys) ? state.seen_keys : [];
  const fresh: string[] = [];
  for (let i = 0; i + 2 < history.length; i++) {
    const a = history[i], x = history[i + 1], b = history[i + 2];
    if (a && a === b && x && x !== a) {
      const key = `${a}|${x}`;
      if (!seen.includes(key) && !fresh.includes(key)) {
        fresh.push(key);
        await db.from('stream_events').insert({
          kind: 'dip', started_at: now, ended_at: now, fallback_title: x,
          detail: { live_song: a, note: 'Βρέθηκε στο ιστορικό του Radio.co (η ώρα είναι περίπου, έως λίγα λεπτά πριν)' },
        });
      }
    }
  }

  await db.from('stream_watch').upsert({
    id: 1, open_event_id: state.open_event_id, last_source: sourceType, last_title: nowTitle || null,
    seen_keys: [...fresh, ...seen].slice(0, 60), updated_at: now,
  });
}
