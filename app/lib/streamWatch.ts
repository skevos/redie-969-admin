import { getSupabaseAdmin } from './supabaseAdmin';

// 📡 Stream watch: runs with the auto-chat cron (every few minutes).
// Records every time Radio.co stops playing the studio (live) and plays its own playlist instead.
//  - 'fallback': caught while it was happening (the source is not live at the check)
//  - 'server'  : a song of Radio.co's own "default" playlist found in Radio.co's history (last ~15 songs),
//                so even a few-second drop between two checks is caught
const STATUS_URL = 'https://public.radio.co/stations/s11d4ceafa/status';

// Radio.co "default" playlist (what plays when the studio drops), as Radio.co reports it: "Artist - Title".
// Taken from Radio.co → Reports → Recently Played (15/11/2026). If the playlist changes, update this list.
const SERVER_TRACKS = [
  'Marianna Voulgari - Kai Horevo Official Music Video', 'Lava, Ropex - Balkan Disco',
  'OtherView - Ο Γύρος του κόσμου | Official Video Clip', 'Unknown - Γιώργος Τσαλίκης-Ξενυχτάω',
  'MAD GREEKΖ - Τριαντάφυλλος-Άστο μη με χαλάς', 'Άννα Βίσση - Σε Περίπτωση Που - Official Music Video',
  'Christina Koletsa - Χριστίνα Κολέτσα - Έκτη αίσθηση (Dj Nikos villa remix) 2017',
  'Ημισκουμπρια Ft. Ελπιδα - Στη Ντισκοτεκ (Dj Mixalis Nikolaidis Disco Tech Edit)',
  'Νίκος Οικονομόπουλος - Σκάσε Ένα Φιλί | Official Music Video (HD)', 'Ελένη Φουρέιρα - Άσε με (Dj a.m. club version)',
  'Unknown - Γιώργος Μαζωνάκης Όπου κοιτάξεις Giorgos Mazonakis Opou kitaksis',
  'Niko Villa - Κωνσταντίνος Αργυρός - Τελικά (Niko Villa G Petrogiannis Remix) 2021',
  'Αντώνης Ρέμος - Τώρα επιζώ | Antonis Remos - Tora epizo | Official Audio Release HQ',
  'Sakis Rouvas - Disco girl (Mykonos remix)', "Τάμτα & Stereo Mike - Σ' Όποιον αρέσει (T-Bat Mashup)",
  'Ειρήνη Παπαδοπούλου - Της Καρδιάς Μου Ο Χορός (Official Music Video)',
  'ΔΕΣΠΟΙΝΑ ΒΑΝΔΗ - ΧΑΝΩ ΕΣΕΝΑ (Pan Jikas Christos Cjs Bootleg RmX)', 'Tamta - Fotia',
  'Αναπάντητες κλήσεις (Mad version 2004) - Χρήστος Δάντης & Έλενα Παπαρίζου',
  'Savvas_mp - Στεφανία Ρίζου, Για Πες (single version). Stefania Rizou, Gia Pes.',
  "VIP's - Χωρίς εσένα (Galea club remix)", '07. Elli Kokkinou Foivos - Matia Klista',
  'Δέσποινα Βανδή - Φαινόμενο - Official Music Video', 'Έλα Κοντά - Μιχάλης Χατζηγιάννης',
  'Ελένη Φουρέιρα - Καραμέλα | Eleni Foureira - Caramela - Official Audio Release',
  '02.Μιχάλης Χατζηγιάννης - Τα χέρια ψηλά και Everyone Dance (United Djs The Medley Mix)',
  'Unknown - Dokimase Me', 'Sakis Rouvas - Kalokeri Ke Fos', "Kostas Martakis - As' Tous Na Lene",
  'ΔΕΣΠΟΙΝΑ ΒΑΝΔΗ - ακρως τολμηρο',
];

// lower case, no accents, single spaces
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const SERVER = new Set<string>();
for (const t of SERVER_TRACKS) {
  SERVER.add(norm(t));
  const i = t.indexOf(' - ');
  if (i > 0) SERVER.add(norm(t.slice(i + 3) + ' - ' + t.slice(0, i))); // also "Title - Artist"
}
const isServerSong = (t: string) => !!t && SERVER.has(norm(t));

const clean = (t: any) => String(t?.title ?? t ?? '').trim();

export async function watchStream(): Promise<void> {
  const db = getSupabaseAdmin();
  const r = await fetch(STATUS_URL, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
  if (!r.ok) return;
  const j: any = await r.json();
  const sourceType = String(j?.source?.type || '');
  const live = sourceType === 'live';
  const nowTitle = clean(j?.current_track);
  const history: string[] = (Array.isArray(j?.history) ? j.history : []).map(clean).filter(Boolean).slice(0, 20);

  const { data: st, error: stErr } = await db.from('stream_watch').select('*').eq('id', 1).maybeSingle();
  if (stErr) return; // SQL not run yet
  const state: any = st || { id: 1, open_event_id: null, seen_keys: [] };
  const now = new Date().toISOString();

  // 1) Caught while it happens
  if (!live && !state.open_event_id) {
    const { data: ev } = await db.from('stream_events').insert({
      kind: 'fallback', started_at: now, fallback_title: nowTitle || null, detail: { source: sourceType, titles: nowTitle ? [nowTitle] : [] },
    }).select('id').single();
    state.open_event_id = ev?.id ?? null;
  } else if (live && state.open_event_id) {
    await db.from('stream_events').update({ ended_at: now }).eq('id', state.open_event_id);
    state.open_event_id = null;
  }

  // 2) Server songs in Radio.co's history (oldest first) that were not logged yet
  const inHistory = Array.from(new Set(history.filter(isServerSong))).reverse();
  if (!live && nowTitle && isServerSong(nowTitle) && !inHistory.includes(nowTitle)) inHistory.push(nowTitle);
  const seen: string[] = Array.isArray(state.seen_keys) ? state.seen_keys : [];
  const fresh = inHistory.filter(t => !seen.includes(t));
  if (fresh.length) {
    // Join with an event of the last 15 minutes (the same drop), else a new one
    const since = new Date(Date.now() - 15 * 60000).toISOString();
    const { data: recent } = await db.from('stream_events').select('id, detail, fallback_title')
      .or(`ended_at.gte.${since},ended_at.is.null`).gte('started_at', new Date(Date.now() - 6 * 3600000).toISOString())
      .order('started_at', { ascending: false }).limit(1);
    const last: any = recent && recent[0];
    if (last) {
      const titles: string[] = Array.isArray(last.detail?.titles) ? last.detail.titles : [];
      await db.from('stream_events').update({
        ended_at: state.open_event_id === last.id ? null : now,
        fallback_title: last.fallback_title || fresh[0],
        detail: { ...(last.detail || {}), titles: [...titles, ...fresh.filter(t => !titles.includes(t))].slice(-60) },
      }).eq('id', last.id);
    } else {
      await db.from('stream_events').insert({
        kind: 'server', started_at: now, ended_at: now, fallback_title: fresh[0],
        detail: { titles: fresh, note: 'Τραγούδι του Radio.co στο ιστορικό· η ώρα είναι η ώρα του ελέγχου (έως λίγα λεπτά μετά)' },
      });
    }
  }

  await db.from('stream_watch').upsert({
    id: 1, open_event_id: state.open_event_id, last_source: sourceType, last_title: nowTitle || null,
    seen_keys: inHistory, updated_at: now, // only songs still in the history: a later drop is logged again
  });
}
