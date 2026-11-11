"use client";
import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

// 📸 Instagram Stories (1080×1920) from REAL numbers — filled automatically every week, one-click PNG download.

const W = 1080, H = 1920;
const flag = (cc: string) => cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';
const COUNTRY: Record<string, string> = { GR: 'Ελλάδα', AU: 'Αυστραλία', NL: 'Ολλανδία', CH: 'Ελβετία', US: 'ΗΠΑ', CA: 'Καναδάς', GB: 'Ην. Βασίλειο', UK: 'Ην. Βασίλειο', CY: 'Κύπρος', FR: 'Γαλλία', IT: 'Ιταλία', BE: 'Βέλγιο', SE: 'Σουηδία', AT: 'Αυστρία' };
const DAYS_GR = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];
const nf = (v: number) => Math.round(v).toLocaleString('el-GR');
// round down to a "nice" number so the + is always true (453 → 450+, 1241 → 1.200+)
function plus(v: number) {
  if (v < 20) return `${Math.floor(v)}`;
  const step = v >= 1000 ? 100 : v >= 200 ? 50 : 10;
  return `${nf(Math.floor(v / step) * step)}+`;
}
function athensToday() {
  const wd = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', weekday: 'short' }).format(new Date());
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd);
}

const base: React.CSSProperties = {
  width: W, height: H, position: 'relative', overflow: 'hidden', color: '#fff',
  fontFamily: 'var(--font-inter), Inter, "Segoe UI", Roboto, sans-serif',
  background: 'radial-gradient(ellipse 900px 700px at 50% 38%, #7a1418 0%, #3a0a0d 45%, #0b0405 80%)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '110px 90px 120px', boxSizing: 'border-box',
};
const glow: React.CSSProperties = { position: 'absolute', left: '50%', top: 620, width: 900, height: 900, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,45,45,.35), rgba(255,45,45,0) 65%)' };
const bigNum: React.CSSProperties = { fontSize: 280, fontWeight: 900, lineHeight: 1, marginTop: 26, position: 'relative', background: 'linear-gradient(180deg,#fff 30%,#ffb3b3)', WebkitBackgroundClip: 'text', color: 'transparent', letterSpacing: -6 };
const kicker: React.CSSProperties = { marginTop: 120, fontSize: 34, letterSpacing: 8, fontWeight: 700, color: '#ff6b6b', position: 'relative' };
const sub: React.CSSProperties = { fontSize: 60, fontWeight: 800, marginTop: 14, textAlign: 'center', lineHeight: 1.15, position: 'relative' };
const card: React.CSSProperties = { background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.12)', borderRadius: 36, padding: '38px 36px' };

function Top({ pill }: { pill: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', position: 'relative' }}>
      <div style={{ fontWeight: 900, fontSize: 44, letterSpacing: 1 }}>REDIE <span style={{ color: '#ff2d2d' }}>969</span></div>
      <div style={{ border: '2px solid rgba(255,90,90,.55)', color: '#ff6b6b', borderRadius: 40, padding: '12px 26px', fontWeight: 700, fontSize: 28, letterSpacing: 3 }}>● {pill}</div>
    </div>
  );
}
function Cta() {
  return (<>
    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 30, background: '#ff2d2d', borderRadius: 60, padding: '28px 46px 28px 30px', boxShadow: '0 20px 60px rgba(255,45,45,.45)', position: 'relative' }}>
      <img src="/logo.png" alt="" style={{ width: 96, height: 96, borderRadius: 24, background: '#000', padding: 8, objectFit: 'contain' }} />
      <div><div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>Κατέβασε την εφαρμογή</div><div style={{ fontSize: 27, opacity: .9, marginTop: 4, fontWeight: 600 }}>Google Play · App Store</div></div>
    </div>
    <div style={{ marginTop: 34, fontSize: 26, color: 'rgba(255,255,255,.55)', letterSpacing: 2, position: 'relative' }}>ΚΑΛΥΜΝΟΣ · WEB RADIO</div>
  </>);
}

export default function StoriesPage() {
  const [stats, setStats] = useState<any>(null);
  const [likes, setLikes] = useState<any>(null);
  const [today, setToday] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [busy, setBusy] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [s, l] = await Promise.all([
          fetch('/api/admin/stats?days=7', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()),
          fetch('/api/admin/song-likes?days=7', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json()).catch(() => null),
        ]);
        if (s?.error) throw new Error(s.error);
        setStats(s); setLikes(l);
        const { data } = await supabase.from('shows').select('title, producer_name, day_of_week, start_time, end_time, image_url, is_active').eq('day_of_week', athensToday()).order('start_time');
        setToday((data || []).filter((x: any) => x.is_active !== false));
      } catch (e: any) { setErr(e?.message || 'Σφάλμα'); }
    })();
  }, []);

  async function download(key: string) {
    const node = refs.current[key];
    if (!node) return;
    setBusy(key);
    try {
      const { toPng } = await import('html-to-image');
      const url = await toPng(node, { width: W, height: H, pixelRatio: 1, cacheBust: true });
      const a = document.createElement('a');
      a.href = url; a.download = `redie969_story_${key}_${new Date().toISOString().slice(0, 10)}.png`; a.click();
    } catch (e: any) { alert('Σφάλμα εικόνας: ' + (e?.message || e)); }
    setBusy('');
  }

  // ---- real numbers ----
  const rc = stats?.radioco;
  const rcHours = rc && !rc.setupNeeded && rc.days?.length ? (rc.hours || []).filter((h: any) => h.region !== 'DE').reduce((a: number, h: any) => a + h.hours, 0) : 0;
  const appHours = stats?.period?.listen_hours || 0;
  const hours = Math.max(rcHours, appHours);
  const countries: string[] = rc && !rc.setupNeeded ? (rc.hours || []).filter((h: any) => h.region !== 'DE' && h.hours >= 0.5).map((h: any) => h.region) : ['GR'];
  const installs = stats?.audience?.installs || 0;
  const chat = stats?.engagement?.chat || 0;
  const topSong = likes?.top?.[0];
  const showsDone = (stats?.shows || []).filter((s: any) => s.occurrences?.length);
  const bestShow = [...showsDone].sort((a: any, b: any) => (b.avg * 3 + b.chat / 10 + b.unique) - (a.avg * 3 + a.chat / 10 + a.unique))[0];

  const stories: { key: string; title: string; ready: boolean; why?: string; node: React.ReactNode }[] = [
    {
      key: 'week', title: 'Η εβδομάδα σε νούμερα', ready: hours > 0,
      node: (
        <div style={base}>
          <div style={glow} />
          <Top pill="ΑΥΤΗ ΤΗΝ ΕΒΔΟΜΑΔΑ" />
          <div style={kicker}>ΑΚΟΥΣΑΤΕ</div>
          <div style={bigNum}>{plus(hours)}</div>
          <div style={sub}>ώρες <span style={{ color: '#ff4b4b' }}>REDIE 969</span><br />μέσα σε 7 μέρες 🔥</div>
          <div style={{ marginTop: 110, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignSelf: 'stretch', position: 'relative' }}>
            <div style={card}><div style={{ fontSize: 84, fontWeight: 900 }}>{plus(installs)}</div><div style={{ fontSize: 30, color: 'rgba(255,255,255,.7)', marginTop: 6, lineHeight: 1.25 }}>κινητά έχουν την εφαρμογή μας</div></div>
            <div style={card}><div style={{ fontSize: 60, marginTop: 4 }}>{countries.slice(0, 5).map(flag).join(' ')}</div><div style={{ fontSize: 30, color: 'rgba(255,255,255,.7)', marginTop: 6, lineHeight: 1.25 }}>{countries.length > 1 ? `μας ακούτε από ${countries.length} χώρες` : 'από την Κάλυμνο σε όλη την Ελλάδα'}</div></div>
            <div style={card}><div style={{ fontSize: 84, fontWeight: 900 }}>{nf(chat)}</div><div style={{ fontSize: 30, color: 'rgba(255,255,255,.7)', marginTop: 6, lineHeight: 1.25 }}>μηνύματα στο live chat</div></div>
            <div style={card}><div style={{ fontSize: 84, fontWeight: 900 }}>{nf(stats?.period?.peak ? Math.max(stats.period.peak, rc?.peak || 0) : 0)}</div><div style={{ fontSize: 30, color: 'rgba(255,255,255,.7)', marginTop: 6, lineHeight: 1.25 }}>ακροατές ταυτόχρονα στην κορύφωση</div></div>
          </div>
          <Cta />
        </div>
      ),
    },
    {
      key: 'song', title: '❤️ Το πιο αγαπημένο τραγούδι', ready: !!topSong, why: 'Χρειάζονται «μου αρέσει» από την εφαρμογή 1.0.9',
      node: (() => {
        const t = String(topSong?.title || '');
        const i = t.indexOf(' - ');
        const artist = i > 0 ? t.slice(0, i) : '';
        const song = i > 0 ? t.slice(i + 3) : t;
        return (
          <div style={base}>
            <div style={glow} />
            <Top pill="ΕΠΙΛΟΓΗ ΤΩΝ ΑΚΡΟΑΤΩΝ" />
            <div style={kicker}>ΤΟ ΠΙΟ ΑΓΑΠΗΜΕΝΟ ΤΡΑΓΟΥΔΙ ΤΗΣ ΕΒΔΟΜΑΔΑΣ</div>
            <div style={{ fontSize: 260, marginTop: 70, position: 'relative' }}>❤️</div>
            <div style={{ ...sub, fontSize: song.length > 22 ? 78 : 104, fontWeight: 900, marginTop: 40 }}>{song}</div>
            {artist ? <div style={{ fontSize: 52, color: '#ff6b6b', fontWeight: 700, marginTop: 18, position: 'relative', textAlign: 'center' }}>{artist}</div> : null}
            <div style={{ ...card, marginTop: 80, position: 'relative', textAlign: 'center', fontSize: 40, fontWeight: 700 }}>{nf(topSong?.likes || 0)} «μου αρέσει» από εσάς 🙌</div>
            <div style={{ marginTop: 40, fontSize: 34, color: 'rgba(255,255,255,.75)', position: 'relative', textAlign: 'center', lineHeight: 1.35 }}>Πάτα την ❤️ δίπλα στο τραγούδι<br />και ψήφισε κι εσύ!</div>
            <Cta />
          </div>
        );
      })(),
    },
    {
      key: 'show', title: '🎙️ Η εκπομπή της εβδομάδας', ready: !!bestShow, why: 'Χρειάζεται τουλάχιστον μία εκπομπή που έπαιξε μέσα στην εβδομάδα',
      node: (
        <div style={base}>
          <div style={glow} />
          <Top pill="ΕΚΠΟΜΠΗ ΤΗΣ ΕΒΔΟΜΑΔΑΣ" />
          <div style={kicker}>🏆 ΤΗΝ ΑΓΑΠΗΣΑΤΕ ΠΙΟ ΠΟΛΥ</div>
          <div style={{ ...sub, fontSize: String(bestShow?.title || '').length > 16 ? 96 : 130, fontWeight: 900, marginTop: 90 }}>{bestShow?.title}</div>
          {bestShow?.producer ? <div style={{ fontSize: 50, color: '#ff6b6b', fontWeight: 700, marginTop: 24, position: 'relative' }}>🎧 {bestShow.producer}</div> : null}
          <div style={{ fontSize: 40, color: 'rgba(255,255,255,.75)', marginTop: 18, position: 'relative' }}>κάθε {DAYS_GR[bestShow?.day_of_week] || ''} {bestShow?.start}–{bestShow?.end}</div>
          <div style={{ marginTop: 100, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignSelf: 'stretch', position: 'relative' }}>
            <div style={card}><div style={{ fontSize: 96, fontWeight: 900 }}>{nf(bestShow?.unique || 0)}</div><div style={{ fontSize: 30, color: 'rgba(255,255,255,.7)', marginTop: 6 }}>ακροατές συντονίστηκαν</div></div>
            <div style={card}><div style={{ fontSize: 96, fontWeight: 900 }}>{nf(bestShow?.chat || 0)}</div><div style={{ fontSize: 30, color: 'rgba(255,255,255,.7)', marginTop: 6 }}>μηνύματα στο chat</div></div>
          </div>
          <div style={{ marginTop: 50, fontSize: 38, fontWeight: 700, position: 'relative' }}>Ευχαριστούμε! ❤️ Τα λέμε ξανά στον αέρα</div>
          <Cta />
        </div>
      ),
    },
    {
      key: 'tonight', title: '📻 Σήμερα στον αέρα', ready: today.length > 0, why: 'Δεν υπάρχει εκπομπή σήμερα στο Πρόγραμμα',
      node: (
        <div style={base}>
          <div style={glow} />
          <Top pill={`ΣΗΜΕΡΑ · ${(DAYS_GR[athensToday()] || '').toUpperCase()}`} />
          <div style={kicker}>ΣΤΟΝ ΑΕΡΑ ΣΗΜΕΡΑ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 34, alignSelf: 'stretch', marginTop: 80, position: 'relative' }}>
            {today.slice(0, 4).map((s: any, i: number) => (
              <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 34, padding: 30 }}>
                {s.image_url ? <img src={s.image_url} alt="" crossOrigin="anonymous" style={{ width: 190, height: 190, borderRadius: 28, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 190, height: 190, borderRadius: 28, background: 'rgba(255,45,45,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 90, flexShrink: 0 }}>🎙️</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 44, fontWeight: 900, color: '#ff4b4b' }}>{String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}</div>
                  <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.1, marginTop: 6 }}>{s.title}</div>
                  {s.producer_name ? <div style={{ fontSize: 34, color: 'rgba(255,255,255,.75)', marginTop: 8 }}>🎧 {s.producer_name}</div> : null}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 60, fontSize: 40, fontWeight: 700, position: 'relative', textAlign: 'center' }}>Live chat, αφιερώσεις & αιτήματα<br />μέσα από την εφαρμογή 💬</div>
          <Cta />
        </div>
      ),
    },
  ];

  const scale = 0.3;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
          <span style={{ fontSize: 26 }}>📸</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Instagram Stories</div>
            <div style={{ fontSize: 12.5, color: '#6b7280' }}>Έτοιμα stories 1080×1920 με τα πραγματικά νούμερα των τελευταίων 7 ημερών — ένα κλικ για κατέβασμα</div>
          </div>
        </header>
        <div style={{ padding: 28 }}>
          {err ? <div style={{ background: 'white', borderRadius: 16, padding: 18, color: '#b91c1c', marginBottom: 18 }}>Σφάλμα: {err}</div> : null}
          {!stats && !err ? <div style={{ color: '#6b7280' }}>Φόρτωση…</div> : null}
          {stats ? (
            <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
              {stories.map(s => (
                <div key={s.key} style={{ background: 'white', borderRadius: 20, padding: 16, border: '1px solid #f3f4f6', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', width: W * scale + 32 }}>
                  <div style={{ fontWeight: 700, color: '#1f2937', marginBottom: 10, fontSize: 14 }}>{s.title}</div>
                  <div style={{ width: W * scale, height: H * scale, overflow: 'hidden', borderRadius: 14, background: '#111', position: 'relative' }}>
                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: W, height: H, opacity: s.ready ? 1 : 0.25 }}>
                      <div ref={el => { refs.current[s.key] = el; }}>{s.node}</div>
                    </div>
                    {!s.ready ? <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20, color: 'white', fontSize: 13 }}>{s.why}</div> : null}
                  </div>
                  <button disabled={!s.ready || busy === s.key} onClick={() => download(s.key)} style={{ marginTop: 12, width: '100%', padding: '10px 0', borderRadius: 12, border: 'none', background: s.ready ? '#e11d48' : '#e5e7eb', color: s.ready ? 'white' : '#9ca3af', fontWeight: 700, cursor: s.ready ? 'pointer' : 'default' }}>
                    {busy === s.key ? 'Ετοιμάζεται…' : '⬇️ Κατέβασμα PNG'}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 20, maxWidth: 760 }}>Τα νούμερα είναι πραγματικά και στρογγυλεμένα προς τα κάτω (π.χ. 453 ώρες → «450+»), ώστε ό,τι γράφει το story να ισχύει. Οι ώρες ακρόασης παίρνονται από το Radio.co (όλες οι πηγές, χωρίς τα ρομπότ) όταν έχει γίνει ενημέρωση, αλλιώς από την εφαρμογή.</p>
        </div>
      </main>
    </div>
  );
}
