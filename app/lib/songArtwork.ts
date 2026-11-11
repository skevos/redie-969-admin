// Remembers the cover of the song playing now (Radio.co gives a cover only for the current song),
// so the app's "Τι έπαιξε πριν" list can show covers for earlier songs too. Table: song_artwork.
import { getSupabaseAdmin } from './supabaseAdmin';

const STATUS_URL = 'https://public.radio.co/stations/s11d4ceafa/status';

export const songKey = (t: string) => t.trim().toLowerCase().replace(/ς/g, 'σ');

export async function rememberCurrentArtwork(): Promise<void> {
  const r = await fetch(STATUS_URL, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!r.ok) return;
  const j: any = await r.json();
  const title = String(j?.current_track?.title || '').trim();
  const art = String(j?.current_track?.artwork_url || '');
  const large = String(j?.current_track?.artwork_url_large || '');
  if (!title || !art.startsWith('https://')) return;
  await getSupabaseAdmin().from('song_artwork').upsert(
    { key: songKey(title), title, artwork_url: art, artwork_large: large || null, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
}
