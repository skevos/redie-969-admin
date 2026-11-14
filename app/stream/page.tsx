"use client";
// 📡 Stream — every time Radio.co stopped playing the studio and played its own playlist (stream_events)
import { useEffect, useMemo, useState } from "react";
import { adminDb } from "../lib/adminDb";
import Sidebar from "../components/Sidebar";

type Ev = { id: number; kind: "fallback" | "dip"; started_at: string; ended_at: string | null; fallback_title: string | null; detail: any };

const card: React.CSSProperties = { background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: 18, marginBottom: 16 };
const fmt = (iso: string) => new Date(iso).toLocaleString("el-GR", { timeZone: "Europe/Athens", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("el-GR", { timeZone: "Europe/Athens", day: "2-digit", month: "2-digit" });
const hourOf = (iso: string) => Number(new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/Athens", hour: "2-digit", hour12: false })) % 24;
function dur(e: Ev) {
  if (e.kind === "dip") return "λίγα δευτ.";
  if (!e.ended_at) return "τώρα";
  const s = Math.max(0, Math.round((new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 1000));
  return s < 60 ? `~${s}″` : `~${Math.round(s / 60)}′`;
}

export default function StreamPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [watch, setWatch] = useState<any>(null);
  const [days, setDays] = useState(7);
  const [setupNeeded, setSetupNeeded] = useState(false);

  async function load() {
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await adminDb.from("stream_events").select("*").gte("started_at", from).order("started_at", { ascending: false }).limit(500);
    if (error) { if (/stream_events|does not exist|schema cache/i.test(error.message)) setSetupNeeded(true); return; }
    setEvents((data || []) as Ev[]);
    const w = await adminDb.from("stream_watch").select("*").eq("id", 1).maybeSingle();
    setWatch(w.data || null);
  }
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [days]);

  const perDay = useMemo(() => {
    const m: Record<string, number> = {};
    events.forEach(e => { const k = dayKey(e.started_at); m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).reverse();
  }, [events]);
  const perHour = useMemo(() => {
    const a = Array(24).fill(0);
    events.forEach(e => { a[hourOf(e.started_at)]++; });
    return a;
  }, [events]);
  const maxHour = Math.max(1, ...perHour);
  const live = watch?.last_source === "live";
  const lastCheck = watch?.updated_at ? Math.round((Date.now() - new Date(watch.updated_at).getTime()) / 60000) : null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: "24px 28px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>📡 Stream</h1>
        <p style={{ color: "#6b7280", margin: "0 0 18px", fontSize: 14 }}>Κάθε φορά που το Radio.co σταμάτησε να παίζει το στούντιο (BUTT) και έβαλε τη δική του λίστα. Έλεγχος κάθε λεπτό.</p>
        {setupNeeded && <div style={{ ...card, background: "#fef3c7", borderColor: "#fcd34d", color: "#92400e" }}>⚠️ Λείπει το SQL για την παρακολούθηση (stream_events).</div>}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ ...card, flex: "1 1 220px", borderColor: watch ? (live ? "#86efac" : "#fca5a5") : "#e5e7eb" }}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Τώρα</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: watch ? (live ? "#16a34a" : "#dc2626") : "#9ca3af" }}>{watch ? (live ? "🟢 Live από το στούντιο" : "🔴 Παίζει ο σέρβερ") : "—"}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{lastCheck != null ? `τελευταίος έλεγχος πριν ${lastCheck}′` : "δεν έχει γίνει έλεγχος ακόμα"}</div>
          </div>
          <div style={{ ...card, flex: "1 1 220px" }}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Διακοπές ({days} ημέρες)</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: events.length ? "#dc2626" : "#16a34a" }}>{events.length}</div>
            <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}>
              <option value={1}>Σήμερα</option><option value={7}>7 ημέρες</option><option value={30}>30 ημέρες</option>
            </select>
          </div>
        </div>

        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>Ποιες ώρες κόβεται</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110 }}>
            {perHour.map((n, h) => (
              <div key={h} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#6b7280" }}>{n || ""}</div>
                <div style={{ height: (n / maxHour) * 80, minHeight: n ? 4 : 1, background: n ? "#ef4444" : "#e5e7eb", borderRadius: 3 }} />
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{String(h).padStart(2, "0")}</div>
              </div>
            ))}
          </div>
          {perDay.length > 0 && <p style={{ fontSize: 12, color: "#6b7280", margin: "12px 0 0" }}>Ανά ημέρα: {perDay.map(([d, n]) => `${d}: ${n}`).join(" · ")}</p>}
        </div>

        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>Όλες οι διακοπές</h2>
          {events.length === 0 ? <p style={{ fontSize: 13, color: "#9ca3af" }}>Καμία διακοπή 🎉</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ textAlign: "left", color: "#6b7280" }}><th style={{ padding: 6 }}>Ώρα</th><th style={{ padding: 6 }}>Διάρκεια</th><th style={{ padding: 6 }}>Τι έπαιξε ο σέρβερ</th><th style={{ padding: 6 }}>Είδος</th></tr></thead>
              <tbody>{events.map(e => (
                <tr key={e.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 6, whiteSpace: "nowrap" }}>{fmt(e.started_at)}</td>
                  <td style={{ padding: 6 }}>{dur(e)}</td>
                  <td style={{ padding: 6 }}><b>{[e.fallback_title, ...((e.detail?.titles || []) as string[]).filter((t: string) => t !== e.fallback_title)].filter(Boolean).join(", ") || "—"}</b>{e.detail?.live_song ? <span style={{ color: "#9ca3af" }}> (μέσα στο «{e.detail.live_song}»)</span> : null}</td>
                  <td style={{ padding: 6, color: "#6b7280" }}>{e.kind === "dip" ? "σύντομη (από ιστορικό)" : "πιάστηκε ζωντανά"}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
