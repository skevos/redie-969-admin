"use client";
// 🌐 Ιστοσελίδα — επεξεργασία της σελίδας του σταθμού με live προεπισκόπηση.
// «Αποθήκευση» = πρόχειρο (δεν φαίνεται στο κοινό). «Δημοσίευση» = περνάει στη δημόσια σελίδα /site.
import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { adminDb, adminUpload } from "../lib/adminDb";
import { DEFAULT_CONTENT, SiteContent, withDefaults } from "../site/content";

const card: React.CSSProperties = { background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, marginBottom: 12 };
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", margin: "8px 0 4px" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" };

const SECTIONS: [keyof SiteContent["show"], string][] = [["about", "Ποιοι είμαστε"], ["schedule", "Πρόγραμμα"], ["producers", "Παραγωγοί"], ["apps", "Εφαρμογή"], ["contact", "Επικοινωνία"]];

export default function SiteEditor() {
  const [c, setC] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const frame = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await adminDb.from("site_pages").select("*").eq("id", "home").maybeSingle();
      if (error) { if (/site_pages|not allowed|does not exist|schema cache/i.test(error.message)) setSetupNeeded(true); else setMsg("⚠️ " + error.message); }
      if (data) { setC(withDefaults((data as any).draft || (data as any).published)); setPublishedAt((data as any).published_at || null); }
      setLoaded(true);
    })();
    const onMsg = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "site-ready") push(); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cRef = useRef(c);
  cRef.current = c;
  function push() { frame.current?.contentWindow?.postMessage({ type: "site-draft", content: cRef.current }, window.location.origin); }
  useEffect(() => { if (loaded) push(); }, [c, loaded]);

  const set = (k: keyof SiteContent, v: any) => { setC(p => ({ ...p, [k]: v })); setDirty(true); };
  const setShow = (k: keyof SiteContent["show"], v: boolean) => { setC(p => ({ ...p, show: { ...p.show, [k]: v } })); setDirty(true); };

  async function save(publish: boolean) {
    setMsg("⏳ ...");
    const now = new Date().toISOString();
    const row: any = { id: "home", draft: c, updated_at: now };
    if (publish) { row.published = c; row.published_at = now; }
    const { error } = await adminDb.from("site_pages").upsert(row, { onConflict: "id" });
    if (error) { setMsg("⚠️ " + error.message); if (/site_pages|not allowed|does not exist/i.test(error.message)) setSetupNeeded(true); return; }
    setDirty(false);
    if (publish) setPublishedAt(now);
    setMsg(publish ? "✅ Δημοσιεύτηκε στο /site" : "💾 Αποθηκεύτηκε ως πρόχειρο");
  }

  async function upload(f: File) {
    setMsg("⏳ Ανέβασμα εικόνας...");
    const r = await adminUpload("producers", `site/hero_${Date.now()}_${f.name.replace(/[^a-zA-Z0-9.]/g, "")}`, f, { upsert: true });
    if (r.error || !r.publicUrl) { setMsg("⚠️ " + (r.error?.message || "Αποτυχία")); return; }
    set("heroImage", r.publicUrl);
    setMsg("✅ Η εικόνα ανέβηκε");
  }

  const T = (k: keyof SiteContent, label: string, area = false) => (
    <>
      <label style={lbl}>{label}</label>
      {area
        ? <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={String(c[k] ?? "")} onChange={e => set(k, e.target.value)} />
        : <input style={inp} value={String(c[k] ?? "")} onChange={e => set(k, e.target.value)} />}
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: "20px 24px", display: "flex", flexDirection: "column", height: "100vh", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>🌐 Ιστοσελίδα</h1>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Ό,τι αλλάζεις φαίνεται αμέσως δεξιά. Το κοινό το βλέπει μόνο όταν πατήσεις «Δημοσίευση». {publishedAt ? `Τελευταία δημοσίευση: ${new Date(publishedAt).toLocaleString("el-GR")}` : "Δεν έχει δημοσιευτεί ακόμα."}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {msg && <span style={{ fontSize: 13, color: "#374151" }}>{msg}</span>}
            <button onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer" }}>{device === "desktop" ? "📱 Κινητό" : "🖥️ Υπολογιστής"}</button>
            <a href="/site" target="_blank" rel="noreferrer" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", color: "#111827", textDecoration: "none", fontSize: 14 }}>↗ Δημόσια σελίδα</a>
            <button onClick={() => save(false)} disabled={!dirty} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: dirty ? "white" : "#f3f4f6", cursor: dirty ? "pointer" : "default", fontWeight: 700 }}>💾 Αποθήκευση</button>
            <button onClick={() => save(true)} style={{ padding: "8px 14px", borderRadius: 8, border: 0, background: "#dc2626", color: "white", cursor: "pointer", fontWeight: 800 }}>🚀 Δημοσίευση</button>
          </div>
        </div>
        {setupNeeded && <div style={{ ...card, background: "#fef3c7", borderColor: "#fcd34d", color: "#92400e" }}>⚠️ Λείπει ο πίνακας site_pages στο Supabase. Μέχρι να τρέξει το SQL, η προεπισκόπηση δουλεύει αλλά δεν αποθηκεύεται.</div>}

        <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
          <div style={{ width: 360, overflowY: "auto", paddingRight: 4 }}>
            <div style={card}>
              <b>🎨 Βασικά</b>
              <label style={lbl}>Χρώμα σταθμού</label>
              <input type="color" value={c.accent} onChange={e => set("accent", e.target.value)} style={{ width: 60, height: 34, border: 0, background: "none" }} />
              {T("heroTitle", "Μεγάλος τίτλος")}
              {T("heroSubtitle", "Υπότιτλος", true)}
              {T("ctaText", "Κουμπί «Άκου»")}
              <label style={lbl}>Εικόνα φόντου (προαιρετική)</label>
              <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
              {c.heroImage && <button onClick={() => set("heroImage", "")} style={{ marginTop: 6, fontSize: 12, border: 0, background: "none", color: "#dc2626", cursor: "pointer" }}>✕ Αφαίρεση εικόνας</button>}
            </div>
            <div style={card}>
              <b>👁️ Ενότητες</b>
              {SECTIONS.map(([k, l]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 14 }}>
                  <input type="checkbox" checked={c.show[k]} onChange={e => setShow(k, e.target.checked)} /> {l}
                </label>
              ))}
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Πρόγραμμα, παραγωγοί, social και links εφαρμογής έρχονται αυτόματα από το dashboard.</div>
            </div>
            <div style={card}><b>📻 Ποιοι είμαστε</b>{T("aboutTitle", "Τίτλος")}{T("aboutText", "Κείμενο", true)}</div>
            <div style={card}><b>📅 Τίτλοι ενοτήτων</b>{T("scheduleTitle", "Πρόγραμμα")}{T("producersTitle", "Παραγωγοί")}{T("appsTitle", "Εφαρμογή")}{T("appsText", "Κείμενο εφαρμογής", true)}</div>
            <div style={card}><b>✉️ Επικοινωνία</b>{T("contactTitle", "Τίτλος")}{T("email", "Email")}{T("phone", "Τηλέφωνο")}{T("address", "Διεύθυνση")}{T("footerText", "Κείμενο στο κάτω μέρος")}</div>
          </div>

          <div style={{ flex: 1, minWidth: 0, background: "#e5e7eb", borderRadius: 14, display: "flex", justifyContent: "center", overflow: "hidden" }}>
            <iframe ref={frame} src="/site?preview=1" onLoad={push} title="Προεπισκόπηση" style={{ width: device === "mobile" ? 390 : "100%", height: "100%", border: 0, background: "#0b0b0f", borderRadius: device === "mobile" ? 24 : 0 }} />
          </div>
        </div>
      </main>
    </div>
  );
}
