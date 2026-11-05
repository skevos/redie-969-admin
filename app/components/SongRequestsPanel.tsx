"use client";
import { useEffect, useRef, useState } from "react";

// Listener song requests / dedications from the app (table song_requests).
// Used in the Studio (variant "card") and in Producer Chat (variant "floating").

type Req = { id: number; song: string; for_name: string | null; from_name: string | null; message: string | null; created_at: string };

const AUTO_STOP_SECONDS = 45; // dedication animation stops by itself after this

export default function SongRequestsPanel({ variant = 'card' }: { variant?: 'card' | 'floating' }) {
  const [requests, setRequests] = useState<Req[]>([]);
  const [open, setOpen] = useState(true);
  const [playedToday, setPlayedToday] = useState(0);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [onAir, setOnAir] = useState<{ song: string; until: number } | null>(null);
  const lastCount = useRef(0);
  const stopTimer = useRef<any>(null);

  async function load() {
    try {
      const r = await fetch('/api/producer/song-requests', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      setSetupNeeded(!!d.setupNeeded);
      setOpen(d.open !== false);
      setPlayedToday(d.playedToday || 0);
      const list: Req[] = d.requests || [];
      // Show the count in the browser tab so a new request is noticed on another tab
      if (typeof document !== 'undefined') {
        const base = document.title.replace(/^\(\d+\) /, '');
        document.title = list.length > 0 ? `(${list.length}) ${base}` : base;
      }
      lastCount.current = list.length;
      setRequests(list);
    } catch {}
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => { clearInterval(t); if (stopTimer.current) clearTimeout(stopTimer.current); };
  }, []);

  async function post(body: any) {
    const r = await fetch('/api/producer/song-requests', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
    return d;
  }

  async function act(req: Req, action: 'air' | 'played' | 'reject') {
    setBusy(req.id);
    try {
      const d = await post({ action, id: req.id });
      if (d?.warning) alert(d.warning);
      if (action === 'air' && d?.started_at) {
        setOnAir({ song: req.song, until: Date.now() + AUTO_STOP_SECONDS * 1000 });
        if (stopTimer.current) clearTimeout(stopTimer.current);
        stopTimer.current = setTimeout(() => { post({ action: 'stop_dedication', started_at: d.started_at }).catch(() => {}); setOnAir(null); }, AUTO_STOP_SECONDS * 1000);
      }
      setRequests(prev => prev.filter(x => x.id !== req.id));
      lastCount.current = Math.max(0, lastCount.current - 1);
      if (action !== 'reject') setPlayedToday(n => n + 1);
    } catch (e: any) {
      alert('Σφάλμα: ' + e.message);
    }
    setBusy(null);
  }

  async function toggleOpen() {
    try { await post({ action: 'open', open: !open }); setOpen(!open); } catch (e: any) { alert('Σφάλμα: ' + e.message); }
  }

  async function stopNow() {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    try { await post({ action: 'stop_dedication' }); } catch {}
    setOnAir(null);
  }

  const time = (iso: string) => new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });

  const body = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
        <p style={{ color: '#6d28d9', fontSize: 13, fontWeight: 700, margin: 0 }}>🎵 Αιτήματα ακροατών {requests.length > 0 && `(${requests.length})`}</p>
        <button onClick={toggleOpen} title="Αν κλείσει, το κουμπί φεύγει από την εφαρμογή"
          style={{ padding: '4px 10px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: open ? '#22c55e' : '#9ca3af', color: 'white' }}>
          {open ? 'ΑΝΟΙΧΤΑ' : 'ΚΛΕΙΣΤΑ'}
        </button>
      </div>
      {setupNeeded && <p style={{ fontSize: 12, color: '#b45309', margin: '0 0 8px 0' }}>Χρειάζεται να τρέξει το SQL για τα αιτήματα.</p>}
      {onAir && (
        <div style={{ background: '#ede9fe', borderRadius: 10, padding: 8, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#5b21b6', flex: 1 }}>💌 Στον αέρα: <b>{onAir.song}</b></span>
          <button onClick={stopNow} style={{ padding: '4px 8px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>⏹ Stop</button>
        </div>
      )}
      {requests.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{open ? 'Κανένα νέο αίτημα' : 'Τα αιτήματα είναι κλειστά στην εφαρμογή'}{playedToday > 0 ? ` · ${playedToday} παίχτηκαν σήμερα` : ''}</p>
      ) : (
        <div style={{ maxHeight: variant === 'floating' ? 360 : 420, overflowY: 'auto' }}>
          {requests.map(r => (
            <div key={r.id} style={{ background: 'white', borderRadius: 10, padding: 10, marginBottom: 8, border: '1px solid #ddd6fe' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', margin: '0 0 2px 0', wordBreak: 'break-word' }}>🎵 {r.song}</p>
              {(r.for_name || r.from_name) && (
                <p style={{ fontSize: 12, color: '#374151', margin: '0 0 2px 0' }}>
                  {r.for_name && <>Για: <b>{r.for_name}</b></>}{r.for_name && r.from_name && ' · '}{r.from_name && <>Από: <b>{r.from_name}</b></>}
                </p>
              )}
              {r.message && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 2px 0', fontStyle: 'italic', wordBreak: 'break-word' }}>«{r.message}»</p>}
              <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 8px 0' }}>{time(r.created_at)}</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={busy === r.id} onClick={() => act(r, 'air')} title="Σημειώνεται ως παιγμένο και παίζει η Αφιέρωση σε όλα τα κινητά"
                  style={{ flex: 2, padding: '6px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💌 Στον αέρα</button>
                <button disabled={busy === r.id} onClick={() => act(r, 'played')} title="Παίχτηκε χωρίς animation"
                  style={{ flex: 1, padding: '6px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✓</button>
                <button disabled={busy === r.id} onClick={() => act(r, 'reject')} title="Απόρριψη"
                  style={{ flex: 1, padding: '6px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (variant === 'card') {
    return <div style={{ background: '#f5f3ff', borderRadius: 16, padding: 20, marginBottom: 16, border: requests.length ? '2px solid #7c3aed' : '1px solid #ddd6fe' }}>{body}</div>;
  }

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 110, zIndex: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      {expanded && (
        <div style={{ width: 320, maxWidth: 'calc(100vw - 40px)', background: '#f5f3ff', borderRadius: 16, padding: 16, border: '1px solid #ddd6fe', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>{body}</div>
      )}
      <button onClick={() => setExpanded(!expanded)}
        style={{ padding: '12px 18px', borderRadius: 30, border: 'none', background: '#7c3aed', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 6px 18px rgba(124,58,237,0.4)' }}>
        🎵 Αιτήματα{requests.length > 0 ? ` (${requests.length})` : ''}
      </button>
    </div>
  );
}
