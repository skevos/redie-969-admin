"use client";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import SongRequestsPanel from "../components/SongRequestsPanel";

// 🎵 Αιτήματα: on/off switch, live queue (same panel as the Studio), full history,
// most requested / most played songs, CSV export.

type Row = {
  id: number; song: string; for_name: string | null; from_name: string | null; message: string | null;
  status: 'new' | 'played' | 'rejected'; created_at: string; handled_at: string | null; handled_by_name?: string;
};

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: '⏳ Νέο', color: '#6d28d9', bg: '#ede9fe' },
  played: { label: '✅ Παίχτηκε', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: '✕ Απορρίφθηκε', color: '#b91c1c', bg: '#fee2e2' },
};

const norm = (s: string) => s.toLocaleLowerCase('el-GR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export default function RequestsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(true);
  const [days, setDays] = useState(30);
  const [filter, setFilter] = useState<'all' | 'played' | 'rejected' | 'new'>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);

  async function load() {
    try {
      const r = await fetch(`/api/producer/song-requests?view=history&days=${days}`, { credentials: 'same-origin', cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
      setRows(d.requests || []);
      setOpen(d.open !== false);
      setSetupNeeded(!!d.setupNeeded);
    } catch (e: any) {
      alert('Σφάλμα φόρτωσης: ' + e.message);
    }
    setLoading(false);
  }

  useEffect(() => { setLoading(true); load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [days]);

  async function toggleOpen() {
    const r = await fetch('/api/producer/song-requests', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'open', open: !open }) });
    if (r.ok) setOpen(!open); else alert('Σφάλμα: ' + ((await r.json().catch(() => null))?.error || r.status));
  }

  const stats = useMemo(() => {
    const played = rows.filter(r => r.status === 'played').length;
    const rejected = rows.filter(r => r.status === 'rejected').length;
    const pending = rows.filter(r => r.status === 'new').length;
    const top = (list: Row[]) => {
      const m = new Map<string, { song: string; n: number }>();
      list.forEach(r => { const k = norm(r.song); if (!k) return; const e = m.get(k); if (e) e.n++; else m.set(k, { song: r.song.trim(), n: 1 }); });
      return Array.from(m.values()).sort((a, b) => b.n - a.n).slice(0, 10);
    };
    return { total: rows.length, played, rejected, pending, topRequested: top(rows), topPlayed: top(rows.filter(r => r.status === 'played')) };
  }, [rows]);

  const shown = rows.filter(r => (filter === 'all' || r.status === filter) && (!q.trim() || norm(`${r.song} ${r.for_name || ''} ${r.from_name || ''} ${r.message || ''}`).includes(norm(q))));

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('el-GR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  function exportCsv() {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Ημερομηνία', 'Τραγούδι', 'Για', 'Από', 'Μήνυμα', 'Κατάσταση', 'Χειρίστηκε', 'Ώρα χειρισμού'];
    const lines = shown.map(r => [fmt(r.created_at), r.song, r.for_name, r.from_name, r.message, STATUS[r.status]?.label.replace(/^\S+\s/, '') || r.status, r.handled_by_name, fmt(r.handled_at)].map(esc).join(';'));
    const blob = new Blob(['﻿' + [head.map(esc).join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `redie969-aitimata-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const card = { background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' } as const;
  const stat = (label: string, value: number, color: string) => (
    <div style={{ ...card, padding: 18, flex: 1, minWidth: 140 }}>
      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, color }}>{value}</p>
    </div>
  );
  const topList = (title: string, list: { song: string; n: number }[]) => (
    <div style={{ ...card, flex: 1, minWidth: 280 }}>
      <p style={{ margin: '0 0 12px', fontWeight: 700, color: '#1f2937' }}>{title}</p>
      {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>Δεν υπάρχουν ακόμα</p> : list.map((t, i) => (
        <div key={t.song + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < list.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: i < 3 ? '#7c3aed' : '#e5e7eb', color: i < 3 ? 'white' : '#374151', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
          <span style={{ flex: 1, fontSize: 13, color: '#1f2937', wordBreak: 'break-word' }}>{t.song}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9' }}>×{t.n}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🎵</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Αιτήματα Τραγουδιών</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{open ? 'Το κουμπί φαίνεται στην εφαρμογή' : 'Το κουμπί είναι κρυμμένο'}</span>
            <button onClick={toggleOpen} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'white', background: open ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#9ca3af' }}>
              {open ? '🟢 ΑΝΟΙΧΤΑ' : '⚪ ΚΛΕΙΣΤΑ'}
            </button>
          </div>
        </header>

        <div style={{ padding: 28, display: 'grid', gap: 20 }}>
          {setupNeeded && <div style={{ ...card, background: '#fffbeb', color: '#92400e' }}>Λείπει ο πίνακας song_requests — χρειάζεται το SQL.</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
            <SongRequestsPanel variant="card" />
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {stat(`Αιτήματα (${days} ημ.)`, stats.total, '#1f2937')}
                {stat('Παίχτηκαν', stats.played, '#15803d')}
                {stat('Απορρίφθηκαν', stats.rejected, '#b91c1c')}
                {stat('Σε αναμονή', stats.pending, '#6d28d9')}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {topList('🔥 Πιο ζητημένα', stats.topRequested)}
                {topList('✅ Πιο πολύ παιγμένα', stats.topPlayed)}
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#1f2937', marginRight: 'auto' }}>📋 Ιστορικό ({shown.length})</p>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Αναζήτηση τραγουδιού / ονόματος" style={{ padding: '9px 12px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 13, minWidth: 220, outline: 'none' }} />
              {(['all', 'played', 'rejected', 'new'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filter === f ? '#7c3aed' : '#f3f4f6', color: filter === f ? 'white' : '#374151' }}>
                  {f === 'all' ? 'Όλα' : STATUS[f].label}
                </button>
              ))}
              <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ padding: '8px 10px', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: 12 }}>
                <option value={1}>Σήμερα</option>
                <option value={7}>7 ημέρες</option>
                <option value={30}>30 ημέρες</option>
                <option value={90}>3 μήνες</option>
                <option value={365}>1 χρόνος</option>
                <option value={3650}>Όλα</option>
              </select>
              <button onClick={exportCsv} disabled={shown.length === 0} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>⬇ Excel (CSV)</button>
            </div>

            {loading ? <p style={{ color: '#9ca3af' }}>Φόρτωση...</p> : shown.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>Δεν υπάρχουν αιτήματα σε αυτό το διάστημα.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#6b7280', fontSize: 12 }}>
                      {['Ημερομηνία', 'Τραγούδι', 'Για', 'Από', 'Μήνυμα', 'Κατάσταση', 'Χειρίστηκε'].map(h => <th key={h} style={{ padding: '8px 10px', borderBottom: '2px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#6b7280' }}>{fmt(r.created_at)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1f2937' }}>{r.song}</td>
                        <td style={{ padding: '8px 10px' }}>{r.for_name || '—'}</td>
                        <td style={{ padding: '8px 10px' }}>{r.from_name || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#6b7280', maxWidth: 260 }}>{r.message || ''}</td>
                        <td style={{ padding: '8px 10px' }}><span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: STATUS[r.status]?.color, background: STATUS[r.status]?.bg, whiteSpace: 'nowrap' }}>{STATUS[r.status]?.label || r.status}</span></td>
                        <td style={{ padding: '8px 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>{r.handled_by_name || ''}{r.handled_at ? ` · ${fmt(r.handled_at)}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
