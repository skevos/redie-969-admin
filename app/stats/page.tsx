"use client";
import { Fragment, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

// 📈 Στατιστικά — real numbers only (no base, no boost). Data: /api/admin/stats (service role).

const DAYS_GR = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];
const red = '#e11d48';

function fmtDate(d: string) {
  const [y, m, dd] = d.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, dd, 12)).getUTCDay(); // 0 = Sunday
  return `${['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'][wd]} ${dd}/${m}`;
}
function fmtTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('el-GR', { timeZone: 'Europe/Athens', weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const n = (v: number) => (v ?? 0).toLocaleString('el-GR');

export default function StatsPage() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [openShow, setOpenShow] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch(`/api/admin/stats?days=${days}`, { credentials: 'same-origin', cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setD(j); setErr('');
    } catch (e: any) { setErr(e?.message || 'Σφάλμα'); }
    setLoading(false);
  }
  useEffect(() => { setLoading(true); load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [days]);

  function exportCsv() {
    if (!d) return;
    const rows = [
      ['REDIE 969 — Στατιστικά (πραγματικά νούμερα εφαρμογής)'],
      ['Περίοδος', `${d.days} ημέρες`, 'από', d.daily[0]?.date, 'έως', d.daily[d.daily.length - 1]?.date],
      [],
      ['Μοναδικοί ακροατές', d.period.unique_listeners], ['Ώρες ακρόασης', d.period.listen_hours], ['Μέσος χρόνος ακρόασης (λεπτά)', d.period.avg_minutes],
      ['Μέγιστοι ταυτόχρονοι', d.period.peak, fmtTime(d.period.peak_at)], ['Χρήστες εφαρμογής', d.period.app_users], ['Ανοίγματα εφαρμογής', d.period.app_opens], ['Νέες εγκαταστάσεις', d.period.new_installs],
      [],
      ['Ημέρα', 'Ακροατές', 'Ώρες', 'Μέγιστοι ταυτόχρονοι', 'Χρήστες εφαρμογής', 'Ανοίγματα', 'Νέες εγκαταστάσεις', 'Απεγκαταστάσεις (εκτ.)', 'Μηνύματα chat', 'Ψήφοι', 'Αιτήματα', '❤️'],
      ...d.daily.map((x: any) => [x.date, x.listeners, x.hours, x.peak, x.appUsers, x.opens, x.newInstalls, x.uninstalls || 0, x.chat, x.votes, x.requests, x.likes]),
      [],
      ['Εκπομπή', 'Παραγωγός', 'Ημέρα', 'Ώρα', 'Μέσος όρος ακροατών', 'Μέγιστοι', 'Μοναδικοί (μ.ο.)', 'Μηνύματα chat'],
      ...d.shows.map((s: any) => [s.title, s.producer || '', DAYS_GR[s.day_of_week] || '', `${s.start}-${s.end}`, s.avg, s.peak, s.unique, s.chat]),
    ];
    const csv = '﻿' + rows.map(r => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `redie969_stats_${d.days}d_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const card = { background: 'white', borderRadius: 20, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' } as const;
  const h2 = { margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#1f2937' } as const;
  const kpi = (label: string, value: any, sub?: string, color = '#1f2937') => (
    <div style={{ ...card, padding: 18, flex: 1, minWidth: 150 }}>
      <p style={{ margin: 0, fontSize: 12.5, color: '#6b7280', fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, color }}>{value}</p>
      {sub ? <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#9ca3af' }}>{sub}</p> : null}
    </div>
  );
  const bars = (items: { label: string; v: number; tip?: string }[], color: string, height = 120) => {
    const max = Math.max(1, ...items.map(i => i.v));
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: items.length > 40 ? 1 : 4, height: height + 34 }}>
        {items.map((i, k) => (
          <div key={k} title={i.tip || `${i.label}: ${i.v}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            {items.length <= 31 ? <span style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>{i.v || ''}</span> : null}
            <div style={{ width: '100%', maxWidth: 34, height: Math.max(i.v ? 3 : 1, (i.v / max) * height), background: i.v ? color : '#e5e7eb', borderRadius: '5px 5px 2px 2px' }} />
            <span style={{ fontSize: 9.5, color: '#9ca3af', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%' }}>{i.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const live = d?.live;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 26 }}>📈</span>
          <div style={{ marginRight: 'auto' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Στατιστικά</div>
            <div style={{ fontSize: 12.5, color: '#6b7280' }}>Πραγματικά νούμερα της εφαρμογής — χωρίς «βάση» και boost</div>
          </div>
          <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: 13 }}>
            <option value={1}>Σήμερα</option>
            <option value={7}>7 ημέρες</option>
            <option value={30}>30 ημέρες</option>
            <option value={90}>90 ημέρες</option>
          </select>
          <button onClick={exportCsv} disabled={!d} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: '#1f2937', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>⬇️ Αναφορά CSV</button>
        </header>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1200 }}>
          {err ? <div style={{ ...card, color: '#b91c1c' }}>Σφάλμα: {err}</div> : null}
          {loading && !d ? <div style={{ ...card, color: '#6b7280' }}>Υπολογισμός…</div> : null}

          {d && (<>
            {/* LIVE */}
            <section style={{ ...card, background: 'linear-gradient(135deg,#111827,#1f2937)', color: 'white', border: 'none' }}>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, letterSpacing: 1.4, color: '#fca5a5', fontWeight: 700 }}>● ΑΚΟΥΝΕ ΤΩΡΑ (ΠΡΑΓΜΑΤΙΚΟΙ)</div>
                  <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>{live.real}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>κινητά που έπαιζαν τα τελευταία 90″ · iOS {live.ios} · Android {live.android}{live.real - live.ios - live.android > 0 ? ` · ; ${live.real - live.ios - live.android}` : ''}</div>
                </div>
                <div style={{ borderLeft: '1px solid #374151', paddingLeft: 24 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Βλέπει το κοινό στην εφαρμογή</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{live.app_shows_public === null ? <span style={{ fontSize: 15, color: '#9ca3af' }}>κρυφό</span> : live.app_shows_public}</div>
                  <div style={{ fontSize: 11.5, color: '#9ca3af' }}>= ακροατές λίστας ({live.real + live.stale_rows}) + «βάση» {live.base}</div>
                </div>
                <div style={{ borderLeft: '1px solid #374151', paddingLeft: 24 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Boost χάρτη (Geo Boost)</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>+{live.boost_total}</div>
                  <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{live.boost_cities.length ? live.boost_cities.map((b: any) => `${b.city} +${b.n}`).join(' · ') : 'καμία ενεργή πόλη'}</div>
                </div>
                {live.stale_rows > 0 ? (
                  <div style={{ borderLeft: '1px solid #374151', paddingLeft: 24 }}>
                    <div style={{ fontSize: 12, color: '#fbbf24' }}>⚠️ «Νεκρές» γραμμές</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#fbbf24' }}>{live.stale_rows}</div>
                    <div style={{ fontSize: 11.5, color: '#9ca3af' }}>κινητά που έκλεισαν χωρίς να το δηλώσουν</div>
                  </div>
                ) : null}
              </div>
              {live.cities.length ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                  {live.cities.map((c: any) => <span key={c.country + c.city} style={{ background: '#374151', borderRadius: 20, padding: '4px 10px', fontSize: 12 }}>📍 {c.city}{c.country ? `, ${c.country}` : ''} · <b>{c.n}</b></span>)}
                </div>
              ) : null}
            </section>

            {/* PERIOD KPIs */}
            <section>
              <h2 style={h2}>{days === 1 ? 'Σήμερα' : `Τελευταίες ${days} ημέρες`}</h2>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {kpi('🎧 Μοναδικοί ακροατές', n(d.period.unique_listeners), 'κινητά που πάτησαν play', red)}
                {kpi('⏱️ Ώρες ακρόασης', n(d.period.listen_hours), `μ.ο. ${d.period.avg_minutes}′ ανά ακρόαση`)}
                {kpi('🔝 Μέγιστοι ταυτόχρονοι', n(d.period.peak), fmtTime(d.period.peak_at))}
                {kpi('📱 Χρήστες εφαρμογής', n(d.period.app_users), `${n(d.period.app_opens)} ανοίγματα`)}
                {kpi('🆕 Νέες εγκαταστάσεις', n(d.period.new_installs), 'πρώτο άνοιγμα στην περίοδο', '#059669')}
              </div>
            </section>

            {/* DAILY CHART */}
            {d.daily.length > 1 ? (
              <section style={card}>
                <h2 style={h2}>Ακροατές ανά ημέρα</h2>
                {bars(d.daily.map((x: any) => ({ label: fmtDate(x.date), v: x.listeners, tip: `${fmtDate(x.date)}: ${x.listeners} ακροατές · ${x.hours} ώρες · μέγιστοι ${x.peak} · ${x.appUsers} χρήστες εφαρμογής` })), red)}
                <h2 style={{ ...h2, marginTop: 18 }}>Ώρες ακρόασης ανά ημέρα</h2>
                {bars(d.daily.map((x: any) => ({ label: fmtDate(x.date), v: x.hours })), '#6366f1', 90)}
              </section>
            ) : null}

            {/* HOURS OF DAY */}
            <section style={card}>
              <h2 style={h2}>Ποιες ώρες ακούνε (μέσος όρος ταυτόχρονων ακροατών)</h2>
              {bars(d.hourly.map((h: any) => ({ label: String(h.hour).padStart(2, '0'), v: h.avg, tip: `${String(h.hour).padStart(2, '0')}:00 — ${h.avg} κατά μέσο όρο` })), '#f59e0b', 100)}
            </section>

            {/* SHOWS */}
            <section style={card}>
              <h2 style={h2}>Ανά εκπομπή</h2>
              <p style={{ margin: '-6px 0 12px', fontSize: 12, color: '#9ca3af' }}>Μέσος όρος = πόσοι άκουγαν κατά μέσο όρο κάθε λεπτό της εκπομπής. Πατήστε μια εκπομπή για κάθε ημερομηνία.</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: '#6b7280', textAlign: 'left' }}>
                      {['Εκπομπή', 'Ημέρα / ώρα', 'Μέσος όρος', 'Μέγιστοι', 'Μοναδικοί', 'Μηνύματα chat', 'Φορές'].map(t => <th key={t} style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>{t}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {d.shows.map((s: any) => (<Fragment key={s.id}>
                      <tr onClick={() => setOpenShow(openShow === s.id ? null : s.id)} style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px' }}><b>{s.title}</b>{s.producer ? <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{s.producer}</div> : null}</td>
                        <td style={{ padding: '10px', color: '#4b5563' }}>{DAYS_GR[s.day_of_week]} {s.start}–{s.end}</td>
                        <td style={{ padding: '10px', fontWeight: 700, color: red }}>{s.occurrences.length ? s.avg : '—'}</td>
                        <td style={{ padding: '10px' }}>{s.occurrences.length ? s.peak : '—'}</td>
                        <td style={{ padding: '10px' }}>{s.occurrences.length ? s.unique : '—'}</td>
                        <td style={{ padding: '10px' }}>{s.occurrences.length ? s.chat : '—'}</td>
                        <td style={{ padding: '10px', color: '#9ca3af' }}>{s.occurrences.length || 'δεν έπαιξε ακόμα'}</td>
                      </tr>
                      {openShow === s.id && s.occurrences.map((o: any) => (
                        <tr key={s.id + o.date} style={{ background: '#fafafa', fontSize: 12.5 }}>
                          <td style={{ padding: '6px 10px 6px 26px', color: '#6b7280' }}>{fmtDate(o.date)}{o.partial ? ' (τώρα)' : ''}</td>
                          <td />
                          <td style={{ padding: '6px 10px' }}>{o.avg}</td>
                          <td style={{ padding: '6px 10px' }}>{o.peak}</td>
                          <td style={{ padding: '6px 10px' }}>{o.unique}</td>
                          <td style={{ padding: '6px 10px' }}>{o.chat}</td>
                          <td />
                        </tr>
                      ))}
                    </Fragment>))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* AUDIENCE + ENGAGEMENT */}
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              <section style={{ ...card, flex: 1, minWidth: 320 }}>
                <h2 style={h2}>Κοινό</h2>
                {[
                  ['Συσκευές που άνοιξαν ποτέ την εφαρμογή', n(d.audience.installs)],
                  ['Ενεργές τις τελευταίες 30 ημέρες', n(d.audience.active30)],
                  ['Πάνω από 14 ημέρες χωρίς άνοιγμα', n(d.audience.inactive14)],
                  ['iOS / Android (όλες)', `${n(d.audience.ios)} / ${n(d.audience.android)}`],
                  ['Δέχονται ειδοποιήσεις', n(d.audience.push_devices)],
                  ['📉 Απεγκαταστάσεις (εκτίμηση, περίοδος)', d.audience.uninstalls?.setupNeeded ? 'χρειάζεται SQL' : `${n(d.audience.uninstalls?.period)}  (iOS ${d.audience.uninstalls?.ios} · Android ${d.audience.uninstalls?.android})`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13.5 }}>
                    <span style={{ color: '#4b5563' }}>{k}</span><b>{v}</b>
                  </div>
                ))}
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9ca3af' }}>Οι απεγκαταστάσεις εντοπίζονται όταν στέλνετε ειδοποίηση: όσα κινητά δεν έχουν πια την εφαρμογή καταγράφονται εκείνη τη στιγμή (μετράνε από 11/11/2026). Επίσημα νούμερα: Play Console «Uninstalled users», App Store Connect «Deletions».</p>
                <p style={{ margin: '16px 0 8px', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>Εκδόσεις (ενεργοί 30 ημερών)</p>
                {d.audience.versions.map((v: any) => {
                  const tot = d.audience.versions.reduce((a: number, b: any) => a + b.n, 0) || 1;
                  return (
                    <div key={v.v} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '3px 0' }}>
                      <span style={{ width: 150, color: '#4b5563' }}>{v.v}</span>
                      <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 8 }}><div style={{ width: `${(v.n / tot) * 100}%`, height: 8, background: '#6366f1', borderRadius: 8 }} /></div>
                      <span style={{ width: 70, textAlign: 'right' }}>{v.n} · {Math.round((v.n / tot) * 100)}%</span>
                    </div>
                  );
                })}
              </section>
              <section style={{ ...card, flex: 1, minWidth: 320 }}>
                <h2 style={h2}>Συμμετοχή ({days === 1 ? 'σήμερα' : `${days} ημέρες`})</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['💬', 'Μηνύματα ακροατών', d.engagement.chat], ['🗳️', 'Ψήφοι', d.engagement.votes], ['🎵', 'Αιτήματα', d.engagement.requests], ['❤️', '«Μου αρέσει»', d.engagement.likes]].map(([i, k, v]) => (
                    <div key={k as string} style={{ background: '#f9fafb', borderRadius: 14, padding: 14 }}>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{i} {k}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#1f2937' }}>{n(v as number)}</div>
                    </div>
                  ))}
                </div>
                {d.daily.length > 1 ? (<>
                  <p style={{ margin: '16px 0 6px', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>Μηνύματα ανά ημέρα</p>
                  {bars(d.daily.map((x: any) => ({ label: fmtDate(x.date), v: x.chat })), '#0ea5e9', 70)}
                </>) : null}
              </section>
            </div>

            <p style={{ fontSize: 11.5, color: '#9ca3af', margin: 0 }}>
              Μετριούνται μόνο οι ακροατές της εφαρμογής. Όσοι ακούν από ιστοσελίδα ή άλλες πλατφόρμες φαίνονται μόνο στο Radio.co. Μια ακρόαση καταγράφεται όταν σταματήσει το play, οπότε αν κάποιος κλείσει απότομα την εφαρμογή χάνεται — τα νούμερα είναι το ελάχιστο. Ενημέρωση κάθε 1′ · {fmtTime(d.generated_at)}
            </p>
          </>)}
        </div>
      </main>
    </div>
  );
}
