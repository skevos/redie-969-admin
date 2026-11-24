"use client";
// Η ιστοσελίδα του σταθμού. Ίδιο component για τη δημόσια σελίδα (/site) και για την προεπισκόπηση στο dashboard.
import { useEffect, useRef, useState } from "react";
import type { SiteContent } from "./content";

type Show = { id: string; title: string; producer_name: string | null; day_of_week: number; start_time: string; end_time: string; image_url: string | null; is_active: boolean; description: string | null };
type Producer = { id: number; name: string; photo_url: string | null; bio: string | null; show_1: string | null; show_2: string | null; is_active: boolean; hidden_in_app: boolean; sort_order: number | null };

const DAYS = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"];
const hm = (t: string) => (t || "").slice(0, 5);

export default function SiteView({ c, shows, producers, settings }: { c: SiteContent; shows: Show[]; producers: Producer[]; settings: any }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<{ title: string; artwork: string } | null>(null);
  const [day, setDay] = useState(() => (new Date().getDay() + 6) % 7);
  const A = c.accent || "#e11d2a";
  const stream = settings?.stream_url || "https://streamer.radio.co/s11d4ceafa/listen";

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch("https://public.radio.co/stations/s11d4ceafa/status", { cache: "no-store" });
        const j = await r.json();
        if (!stop) setTrack({ title: String(j?.current_track?.title || "").trim(), artwork: j?.current_track?.artwork_url_large || j?.current_track?.artwork_url || "" });
      } catch { /* χωρίς now playing */ }
    };
    load();
    const t = setInterval(load, 20000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (playing) { a.pause(); a.src = ""; setPlaying(false); }
    else { a.src = stream + "?t=" + Date.now(); a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  const dayShows = shows.filter(s => s.is_active && s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const crew = producers.filter(p => p.is_active && !p.hidden_in_app).sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
  const socials = [
    ["Facebook", settings?.facebook_url], ["Instagram", settings?.instagram_url], ["TikTok", settings?.tiktok_url], ["YouTube", settings?.youtube_url],
  ].filter(([, u]) => !!u) as [string, string][];

  const section: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "72px 22px" };
  const h2: React.CSSProperties = { fontSize: 34, fontWeight: 900, margin: "0 0 26px", letterSpacing: -0.5 };
  const nav = [
    c.show.schedule && ["#schedule", "Πρόγραμμα"], c.show.producers && ["#producers", "Παραγωγοί"],
    c.show.apps && ["#apps", "Εφαρμογή"], c.show.contact && ["#contact", "Επικοινωνία"],
  ].filter(Boolean) as [string, string][];

  return (
    <div style={{ background: "#0b0b0f", color: "#f5f5f7", minHeight: "100vh", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <audio ref={audio} preload="none" />
      <style>{`
        .rs-a{color:inherit;text-decoration:none;opacity:.85}.rs-a:hover{opacity:1}
        @keyframes rsPulse{0%{box-shadow:0 0 0 0 ${A}99}70%{box-shadow:0 0 0 18px ${A}00}100%{box-shadow:0 0 0 0 ${A}00}}
        @keyframes rsBar{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
        .rs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}
        @media(max-width:700px){.rs-hide{display:none}.rs-h1{font-size:46px!important}}
      `}</style>

      {/* Μενού */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(11,11,15,.82)", backdropFilter: "blur(12px)", borderBottom: "1px solid #ffffff14" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 22px", display: "flex", alignItems: "center", gap: 18 }}>
          <img src="/app-logo.png" alt="REDIE 969" style={{ height: 38, borderRadius: 8 }} />
          <div style={{ fontWeight: 900, fontSize: 18 }}>REDIE <span style={{ color: A }}>969</span></div>
          <nav className="rs-hide" style={{ marginLeft: "auto", display: "flex", gap: 22, fontSize: 14, fontWeight: 600 }}>
            {nav.map(([h, l]) => <a key={h} className="rs-a" href={h}>{l}</a>)}
          </nav>
          <button onClick={toggle} style={{ marginLeft: nav.length ? 8 : "auto", background: A, color: "white", border: 0, borderRadius: 999, padding: "9px 16px", fontWeight: 800, cursor: "pointer" }}>{playing ? "❚❚ Παύση" : "▶ Live"}</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden", background: c.heroImage ? `linear-gradient(180deg,#0b0b0fcc,#0b0b0f), url(${c.heroImage}) center/cover` : `radial-gradient(1100px 500px at 20% 0%, ${A}55, transparent 60%), radial-gradient(900px 500px at 90% 30%, #6d28d955, transparent 60%), #0b0b0f` }}>
        <div style={{ ...section, padding: "110px 22px 90px", display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 420px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#ffffff12", border: "1px solid #ffffff22", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: 9, background: A, animation: "rsPulse 1.6s infinite" }} /> ON AIR · Κάλυμνος
            </div>
            <h1 className="rs-h1" style={{ fontSize: 76, lineHeight: 1, fontWeight: 900, margin: "18px 0 14px", letterSpacing: -2 }}>{c.heroTitle}</h1>
            <p style={{ fontSize: 19, lineHeight: 1.55, color: "#d4d4d8", maxWidth: 560, margin: 0, whiteSpace: "pre-line" }}>{c.heroSubtitle}</p>
            <button onClick={toggle} style={{ marginTop: 28, background: A, color: "white", border: 0, borderRadius: 999, padding: "16px 28px", fontSize: 17, fontWeight: 800, cursor: "pointer", animation: playing ? "none" : "rsPulse 2s infinite" }}>{playing ? "❚❚ Παύση" : c.ctaText}</button>
          </div>
          {/* Now playing */}
          <div style={{ flex: "0 1 340px", background: "#ffffff0d", border: "1px solid #ffffff1f", borderRadius: 24, padding: 18, backdropFilter: "blur(10px)" }}>
            <div style={{ aspectRatio: "1", borderRadius: 16, overflow: "hidden", background: `linear-gradient(135deg, ${A}, #111)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {track?.artwork ? <img src={track.artwork} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src="/app-logo.png" alt="" style={{ width: "55%" }} />}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
              <div style={{ display: "flex", gap: 3, height: 18, alignItems: "flex-end" }}>
                {[0, 1, 2, 3].map(i => <span key={i} style={{ width: 4, height: 18, background: A, borderRadius: 2, transformOrigin: "bottom", animation: playing ? `rsBar .9s ${i * 0.15}s infinite` : "none", transform: playing ? undefined : "scaleY(.35)" }} />)}
              </div>
              <div style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 700 }}>ΠΑΙΖΕΙ ΤΩΡΑ</div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6, minHeight: 24 }}>{track?.title || "REDIE 969"}</div>
          </div>
        </div>
      </section>

      {c.show.about && (
        <section style={section}>
          <h2 style={h2}>{c.aboutTitle}</h2>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: "#d4d4d8", maxWidth: 820, whiteSpace: "pre-line", margin: 0 }}>{c.aboutText}</p>
        </section>
      )}

      {c.show.schedule && (
        <section id="schedule" style={{ background: "#111117" }}>
          <div style={section}>
            <h2 style={h2}>{c.scheduleTitle}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => setDay(i)} style={{ border: "1px solid " + (i === day ? A : "#ffffff26"), background: i === day ? A : "transparent", color: "white", borderRadius: 999, padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>{d}</button>
              ))}
            </div>
            {dayShows.length === 0 ? <div style={{ color: "#a1a1aa" }}>Μουσική όλη μέρα με το REDIE 969 🎶</div> : (
              <div className="rs-grid">
                {dayShows.map(s => (
                  <div key={s.id} style={{ background: "#ffffff0a", border: "1px solid #ffffff1a", borderRadius: 18, overflow: "hidden" }}>
                    <div style={{ height: 150, background: s.image_url ? `url(${s.image_url}) center/cover` : `linear-gradient(135deg, ${A}, #222)` }} />
                    <div style={{ padding: 14 }}>
                      <div style={{ color: A, fontWeight: 800, fontSize: 13 }}>{hm(s.start_time)} – {hm(s.end_time)}</div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginTop: 4 }}>{s.title}</div>
                      {s.producer_name && <div style={{ color: "#a1a1aa", fontSize: 14, marginTop: 2 }}>με {s.producer_name}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {c.show.producers && crew.length > 0 && (
        <section id="producers" style={section}>
          <h2 style={h2}>{c.producersTitle}</h2>
          <div className="rs-grid">
            {crew.map(p => (
              <div key={p.id} style={{ textAlign: "center", background: "#ffffff08", border: "1px solid #ffffff14", borderRadius: 20, padding: 20 }}>
                <div style={{ width: 120, height: 120, margin: "0 auto", borderRadius: 999, padding: 3, background: `linear-gradient(135deg, ${A}, #6d28d9)` }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: 999, background: p.photo_url ? `url(${p.photo_url}) center/cover` : "#222" }} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 17, marginTop: 12 }}>{p.name}</div>
                {(p.show_1 || p.show_2) && <div style={{ color: A, fontSize: 13, fontWeight: 700, marginTop: 4 }}>{[p.show_1, p.show_2].filter(Boolean).join(" · ")}</div>}
                {p.bio && <div style={{ color: "#a1a1aa", fontSize: 13, marginTop: 6 }}>{p.bio}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {c.show.apps && (
        <section id="apps" style={{ background: `linear-gradient(135deg, ${A}, #7f1d1d)` }}>
          <div style={{ ...section, display: "flex", gap: 30, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 380px" }}>
              <h2 style={{ ...h2, marginBottom: 12 }}>{c.appsTitle}</h2>
              <p style={{ fontSize: 17, lineHeight: 1.6, margin: 0, opacity: 0.92 }}>{c.appsText}</p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {settings?.ios_store_url && <a href={settings.ios_store_url} target="_blank" rel="noreferrer" style={{ background: "#000", color: "white", borderRadius: 14, padding: "12px 20px", fontWeight: 800, textDecoration: "none" }}> App Store</a>}
              {settings?.android_store_url && <a href={settings.android_store_url} target="_blank" rel="noreferrer" style={{ background: "#000", color: "white", borderRadius: 14, padding: "12px 20px", fontWeight: 800, textDecoration: "none" }}>▶ Google Play</a>}
            </div>
          </div>
        </section>
      )}

      {c.show.contact && (
        <section id="contact" style={section}>
          <h2 style={h2}>{c.contactTitle}</h2>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {c.email && <a href={`mailto:${c.email}`} style={{ background: "#ffffff0d", border: "1px solid #ffffff1f", borderRadius: 16, padding: "14px 18px", color: "white", textDecoration: "none", fontWeight: 700 }}>✉️ {c.email}</a>}
            {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} style={{ background: "#ffffff0d", border: "1px solid #ffffff1f", borderRadius: 16, padding: "14px 18px", color: "white", textDecoration: "none", fontWeight: 700 }}>📞 {c.phone}</a>}
            {c.address && <div style={{ background: "#ffffff0d", border: "1px solid #ffffff1f", borderRadius: 16, padding: "14px 18px", fontWeight: 700 }}>📍 {c.address}</div>}
          </div>
          {socials.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              {socials.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noreferrer" style={{ border: `1px solid ${A}`, color: "white", borderRadius: 999, padding: "8px 16px", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>{n}</a>)}
            </div>
          )}
        </section>
      )}

      <footer style={{ borderTop: "1px solid #ffffff14", padding: "26px 22px", textAlign: "center", color: "#71717a", fontSize: 13 }}>{c.footerText}</footer>
    </div>
  );
}
