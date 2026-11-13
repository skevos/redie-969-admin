"use client";
// 📝 Φόρμες & Αιτήματα — forms built here appear in the app behind the 🎵 button (app_forms).
// Answers land in song_requests (form_id + answers). From the inbox each one can go to the producers
// (Studio / producer chat) or be shown on every phone as a designed card (app_animations type 'form_card').
import { useEffect, useMemo, useRef, useState } from "react";
import { adminDb } from "../lib/adminDb";
import Sidebar from "../components/Sidebar";

type Field = { id: string; label: string; type: "text" | "long" | "choice" | "number"; required: boolean; placeholder?: string; options?: string[]; role?: "" | "song" | "for" | "from" | "message" };
type Card = { colors: string[]; text: string; label: string; title: string; subtitle: string; message: string; footer: string; duration: number };
type Form = { id?: number; title: string; subtitle: string; emoji: string; button_text: string; done_text: string; fields: Field[]; card: Card; route: "review" | "producers"; is_active: boolean; sort_order: number };
type Answer = { label: string; value: string; role?: string };
type Req = { id: number; song: string; for_name: string | null; from_name: string | null; message: string | null; created_at: string; status?: string; form_id?: number | null; answers?: Answer[] | null; needs_review?: boolean };

const TYPES: { v: Field["type"]; l: string }[] = [
  { v: "text", l: "Κείμενο" }, { v: "long", l: "Μεγάλο κείμενο" }, { v: "choice", l: "Επιλογές (κουμπάκια)" }, { v: "number", l: "Αριθμός" },
];
const ROLES: { v: NonNullable<Field["role"]>; l: string }[] = [
  { v: "", l: "—" }, { v: "song", l: "Τραγούδι" }, { v: "for", l: "Για ποιον" }, { v: "from", l: "Από ποιον" }, { v: "message", l: "Μήνυμα" },
];
const PALETTES: string[][] = [
  ["#7A0F2A", "#F02828", "#FF8A3D"], ["#1E3A8A", "#2D8CFF", "#7DD3FC"], ["#3B0764", "#B14DFF", "#FF3D9A"],
  ["#064E3B", "#22D36B", "#A3E635"], ["#3F2A00", "#FFB020", "#FFE08A"], ["#111827", "#374151", "#6B7280"],
];
const DEFAULT_CARD: Card = { colors: PALETTES[0], text: "#FFFFFF", label: "💌 ΑΦΙΕΡΩΣΗ", title: "", subtitle: "", message: "", footer: "", duration: 15 };
const newForm = (): Form => ({
  title: "Νέα φόρμα", subtitle: "", emoji: "📝", button_text: "Αποστολή", done_text: "Στάλθηκε! Μείνε συντονισμένος!",
  fields: [{ id: "f" + Date.now().toString(36), label: "Η απάντησή σου", type: "text", required: true, placeholder: "", role: "" }],
  card: { ...DEFAULT_CARD, label: "🎙️ ΑΚΡΟΑΤΗΣ", title: "{Η απάντησή σου}" }, route: "review", is_active: false, sort_order: 0,
});

function normForm(f: any): Form {
  const card = { ...DEFAULT_CARD, ...(f?.card && typeof f.card === "object" ? f.card : {}) };
  if (!Array.isArray(card.colors) || card.colors.length === 0) card.colors = PALETTES[0];
  return {
    id: f.id, title: f.title || "", subtitle: f.subtitle || "", emoji: f.emoji || "📝", button_text: f.button_text || "", done_text: f.done_text || "",
    fields: Array.isArray(f.fields) ? f.fields.map((x: any) => ({ id: String(x.id || x.label || Math.random()), label: x.label || "", type: x.type || "text", required: !!x.required, placeholder: x.placeholder || "", options: Array.isArray(x.options) ? x.options : [], role: x.role || "" })) : [],
    card, route: f.route === "producers" ? "producers" : "review", is_active: f.is_active !== false, sort_order: Number(f.sort_order) || 0,
  };
}

// "{Label}" -> the answer. A line whose placeholders are all empty disappears ("για {Για ποιον;}" with no name -> nothing).
function fill(tpl: string, answers: Answer[]): string {
  if (!tpl) return "";
  let any = false, filled = false;
  const out = tpl.replace(/\{([^}]+)\}/g, (_, k) => {
    any = true;
    const a = answers.find(x => x.label.trim() === String(k).trim());
    if (a && a.value) { filled = true; return a.value; }
    return "";
  });
  if (any && !filled) return "";
  return out.replace(/\s+/g, " ").trim();
}
function answersOf(r: Req): Answer[] {
  if (Array.isArray(r.answers) && r.answers.length) return r.answers;
  const a: Answer[] = [{ label: "Τραγούδι", value: r.song, role: "song" }];
  if (r.for_name) a.push({ label: "Για ποιον;", value: r.for_name, role: "for" });
  if (r.from_name) a.push({ label: "Από ποιον;", value: r.from_name, role: "from" });
  if (r.message) a.push({ label: "Η αφιέρωσή σου", value: r.message, role: "message" });
  return a;
}

const card: React.CSSProperties = { background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: 18, marginBottom: 16 };
const btn = (bg: string, fg = "white"): React.CSSProperties => ({ padding: "8px 14px", background: bg, color: fg, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" });
const input: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
const lab: React.CSSProperties = { fontSize: 12, color: "#6b7280", fontWeight: 600, display: "block", margin: "8px 0 3px" };

function CardPreview({ c, small }: { c: Card & { title: string }; small?: boolean }) {
  const cols = c.colors.length === 1 ? [c.colors[0], c.colors[0]] : c.colors;
  return (
    <div style={{ borderRadius: small ? 16 : 22, padding: small ? 14 : 20, color: c.text, background: `linear-gradient(135deg, ${cols.join(", ")})`, boxShadow: `0 16px 40px ${cols[1] || cols[0]}66`, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: small ? 10 : 12, letterSpacing: 2, opacity: 0.85, fontWeight: 600 }}><span>{c.label}</span><span>✕</span></div>
      {c.title && <div style={{ fontSize: small ? 17 : 22, fontWeight: 800, margin: "8px 0 2px", lineHeight: 1.15 }}>{c.title}</div>}
      {c.subtitle && <div style={{ fontSize: small ? 12 : 14, opacity: 0.92 }}>{c.subtitle}</div>}
      {c.message && <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 10, marginTop: 10, fontSize: small ? 12 : 14, fontStyle: "italic" }}>«{c.message}»</div>}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: small ? 10.5 : 12, opacity: 0.9 }}><span>{c.footer}</span><b>REDIE 969</b></div>
    </div>
  );
}

export default function FormsPage() {
  const [tab, setTab] = useState<"inbox" | "forms">("inbox");
  const [forms, setForms] = useState<Form[]>([]);
  const [sel, setSel] = useState<number>(-1);
  const [draft, setDraft] = useState<Form | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [pending, setPending] = useState<Req[]>([]);
  const [sent, setSent] = useState<Req[]>([]);
  const [cardOn, setCardOn] = useState<{ title: string; until: number } | null>(null);
  const [sendCard, setSendCard] = useState<{ req: Req; c: Card } | null>(null);
  const focusRef = useRef<{ key: keyof Card; el: HTMLInputElement | null }>({ key: "title", el: null });

  useEffect(() => { loadForms(); loadInbox(); const t = setInterval(loadInbox, 5000); return () => clearInterval(t); }, []);
  useEffect(() => { if (!cardOn) return; const t = setTimeout(() => setCardOn(null), Math.max(0, cardOn.until - Date.now())); return () => clearTimeout(t); }, [cardOn]);

  async function loadForms(selectId?: number) {
    const { data, error } = await adminDb.from("app_forms").select("*").order("sort_order").order("id");
    if (error) { if (/app_forms|does not exist|schema cache/i.test(error.message)) setSetupNeeded(true); return; }
    const list: Form[] = (data || []).map(normForm);
    setForms(list);
    const idx = selectId != null ? list.findIndex(f => f.id === selectId) : (sel >= 0 && sel < list.length ? sel : (list.length ? 0 : -1));
    setSel(idx);
    setDraft(idx >= 0 ? JSON.parse(JSON.stringify(list[idx])) : null);
  }

  async function api(body?: any, query = "") {
    const r = await fetch("/api/producer/song-requests" + query, body ? { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { credentials: "same-origin", cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`);
    return d;
  }
  async function loadInbox() {
    try { const d = await api(undefined, "?view=inbox"); setPending(d.pending || []); setSent(d.sent || []); if (d.setupNeeded) setSetupNeeded(true); } catch {}
  }

  const formOf = (r: Req) => forms.find(f => f.id === r.form_id) || forms[0];
  function cardFor(r: Req, winner = false): Card {
    const f = formOf(r);
    const base = f?.card || DEFAULT_CARD;
    const a = answersOf(r);
    return {
      ...base,
      label: winner ? "🏆 ΝΙΚΗΤΗΣ" : base.label,
      title: fill(base.title, a) || (winner ? (r.from_name || r.song) : r.song),
      subtitle: fill(base.subtitle, a), message: fill(base.message, a), footer: fill(base.footer, a),
    };
  }

  async function act(r: Req, action: "approve" | "reject" | "played") {
    setBusy("r" + r.id);
    try { await api({ action, id: r.id }); await loadInbox(); } catch (e: any) { alert("Σφάλμα: " + e.message); }
    setBusy("");
  }
  async function showCard() {
    if (!sendCard) return;
    setBusy("card");
    try {
      await api({ action: "card", id: sendCard.req.id, settings: sendCard.c });
      setCardOn({ title: sendCard.c.title, until: Date.now() + sendCard.c.duration * 1000 });
      setSendCard(null);
    } catch (e: any) { alert("Σφάλμα: " + e.message); }
    setBusy("");
  }
  async function stopCard() { try { await api({ action: "card_stop" }); } catch {} setCardOn(null); }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim()) { alert("Βάλε τίτλο στη φόρμα"); return; }
    if (draft.fields.some(f => !f.label.trim())) { alert("Κάθε κελί θέλει όνομα"); return; }
    setBusy("save");
    const row: any = { ...draft, fields: draft.fields.map(f => ({ ...f, options: f.type === "choice" ? (f.options || []).map(o => o.trim()).filter(Boolean) : undefined })) };
    delete row.id;
    const res = draft.id ? await adminDb.from("app_forms").update(row).eq("id", draft.id).select("id").single()
      : await adminDb.from("app_forms").insert(row).select("id").single();
    setBusy("");
    if (res.error) { alert("Σφάλμα: " + res.error.message); return; }
    setMsg("✅ Αποθηκεύτηκε. Η εφαρμογή τη δείχνει την επόμενη φορά που ο ακροατής πατάει το κουμπί.");
    setTimeout(() => setMsg(""), 5000);
    loadForms(res.data?.id ?? draft.id);
  }
  // On / off in the app straight from the list (saved at once, no need to open the form)
  async function toggleActive(f: Form) {
    if (!f.id) return;
    setBusy("t" + f.id);
    const { error } = await adminDb.from("app_forms").update({ is_active: !f.is_active }).eq("id", f.id);
    setBusy("");
    if (error) { alert("Σφάλμα: " + error.message); return; }
    setForms(list => list.map(x => x.id === f.id ? { ...x, is_active: !f.is_active } : x));
    setDraft(d => d && d.id === f.id ? { ...d, is_active: !f.is_active } : d);
    setMsg(!f.is_active ? `✅ «${f.title}» ανοιχτή στην εφαρμογή.` : `⏸ «${f.title}» κλειστή — δεν φαίνεται στην εφαρμογή, μένει αποθηκευμένη.`);
    setTimeout(() => setMsg(""), 4000);
  }

  async function remove() {
    if (!draft?.id || !confirm(`Διαγραφή της φόρμας «${draft.title}»; Τα αιτήματα που ήρθαν από αυτήν μένουν.`)) return;
    const { error } = await adminDb.from("app_forms").delete().eq("id", draft.id);
    if (error) { alert("Σφάλμα: " + error.message); return; }
    setSel(-1); loadForms();
  }

  const set = (p: Partial<Form>) => setDraft(d => d ? { ...d, ...p } : d);
  const setCard = (p: Partial<Card>) => setDraft(d => d ? { ...d, card: { ...d.card, ...p } } : d);
  const setField = (i: number, p: Partial<Field>) => setDraft(d => d ? { ...d, fields: d.fields.map((f, j) => j === i ? { ...f, ...p } : f) } : d);
  const moveField = (i: number, dir: -1 | 1) => setDraft(d => { if (!d) return d; const a = [...d.fields]; const j = i + dir; if (j < 0 || j >= a.length) return d; [a[i], a[j]] = [a[j], a[i]]; return { ...d, fields: a }; });

  // Card preview with example answers
  const sample: Answer[] = useMemo(() => (draft?.fields || []).map(f => ({
    label: f.label, value: f.type === "choice" ? (f.options?.find(Boolean) || f.label) : f.role === "song" ? "Ξημερώματα" : f.role === "for" ? "τη Μαρία" : f.role === "from" ? "Νίκο" : f.role === "message" ? "Χρόνια πολλά!" : (f.placeholder || f.label),
  })), [draft?.fields]);
  const previewCard = draft ? { ...draft.card, title: fill(draft.card.title, sample), subtitle: fill(draft.card.subtitle, sample), message: fill(draft.card.message, sample), footer: fill(draft.card.footer, sample) } : null;

  function insertTag(label: string) {
    const { key, el } = focusRef.current;
    if (!draft) return;
    const cur = String(draft.card[key] ?? "");
    const tag = `{${label}}`;
    const pos = el && el.selectionStart != null ? el.selectionStart : cur.length;
    setCard({ [key]: cur.slice(0, pos) + tag + cur.slice(pos) } as any);
  }

  const time = (iso: string) => new Date(iso).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });

  const reqRow = (r: Req, review: boolean) => {
    const f = forms.find(x => x.id === r.form_id);
    const a = answersOf(r);
    return (
      <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 10, background: review ? "#fffbeb" : "white" }}>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{f ? `${f.emoji} ${f.title}` : "🎵 Αίτημα"} · {time(r.created_at)}</div>
        {a.map((x, i) => <div key={i} style={{ fontSize: 13, color: "#111827", wordBreak: "break-word" }}><span style={{ color: "#6b7280" }}>{x.label}:</span> <b>{x.value}</b></div>)}
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {review && <button disabled={busy === "r" + r.id} onClick={() => act(r, "approve")} style={btn("#7c3aed")} title="Το βλέπουν οι παραγωγοί στο Studio και στο chat παραγωγών">🎙️ Στους παραγωγούς</button>}
          <button onClick={() => setSendCard({ req: r, c: cardFor(r) })} style={btn("#16a34a")} title="Κάρτα σε όλα τα κινητά">💌 Κάρτα στην εφαρμογή</button>
          <button onClick={() => setSendCard({ req: r, c: cardFor(r, true) })} style={btn("#f59e0b")}>🏆 Νικητής</button>
          {!review && <button disabled={busy === "r" + r.id} onClick={() => act(r, "played")} style={btn("#f3f4f6", "#374151")} title="Τελείωσε, φεύγει από τη λίστα">✓</button>}
          <button disabled={busy === "r" + r.id} onClick={() => { if (confirm("Απόρριψη;")) act(r, "reject"); }} style={btn("#fef2f2", "#dc2626")}>🗑️</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: "24px 28px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>📝 Φόρμες & Αιτήματα</h1>
        <p style={{ color: "#6b7280", margin: "0 0 16px", fontSize: 14 }}>Φτιάχνεις φόρμες με δικά σου κελιά (αίτημα, αφιέρωση, παιχνίδι). Οι ακροατές τις βρίσκουν στο κουμπί 🎵 της εφαρμογής (1.0.9). Από τα Εισερχόμενα στέλνεις κάθε απάντηση στους παραγωγούς ή τη δείχνεις σε όλα τα κινητά σαν κάρτα.</p>
        {setupNeeded && <div style={{ ...card, background: "#fef3c7", borderColor: "#fcd34d", color: "#92400e" }}>⚠️ Λείπει το SQL για τις φόρμες (redie_forms.sql). Μέχρι να τρέξει, οι φόρμες δεν αποθηκεύονται.</div>}
        {msg && <div style={{ ...card, background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46", padding: 14 }}>{msg}</div>}
        {cardOn && <div style={{ ...card, background: "#ecfdf5", borderColor: "#86efac", display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
          <span style={{ flex: 1, fontSize: 14, color: "#065f46" }}>💌 Τώρα στα κινητά: <b>{cardOn.title}</b></span>
          <button onClick={stopCard} style={btn("#16a34a")}>⏹ Σταμάτα την κάρτα</button></div>}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setTab("inbox")} style={btn(tab === "inbox" ? "#dc2626" : "#e5e7eb", tab === "inbox" ? "white" : "#374151")}>📥 Εισερχόμενα {pending.length > 0 && `(${pending.length})`}</button>
          <button onClick={() => setTab("forms")} style={btn(tab === "forms" ? "#dc2626" : "#e5e7eb", tab === "forms" ? "white" : "#374151")}>🧩 Φόρμες & σχέδιο κάρτας</button>
        </div>

        {tab === "inbox" && (
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ ...card, flex: "1 1 420px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>⏳ Περιμένουν εσένα</h2>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>Από φόρμες με «Πρώτα σε μένα». Οι παραγωγοί δεν τα βλέπουν μέχρι να πατήσεις 🎙️.</p>
              {pending.length === 0 ? <p style={{ fontSize: 13, color: "#9ca3af" }}>Τίποτα καινούριο</p> : pending.map(r => reqRow(r, true))}
            </div>
            <div style={{ ...card, flex: "1 1 420px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>🎙️ Στους παραγωγούς (24 ώρες)</h2>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>Αυτά φαίνονται τώρα στο Studio και στο chat παραγωγών. Μπορείς να τα δείξεις και σαν κάρτα.</p>
              {sent.length === 0 ? <p style={{ fontSize: 13, color: "#9ca3af" }}>Κανένα</p> : sent.map(r => reqRow(r, false))}
            </div>
          </div>
        )}

        {tab === "forms" && (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ ...card, width: 250, flex: "0 0 250px" }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 10px" }}>Οι φόρμες σου</h2>
              {forms.map((f, i) => (
                <div key={f.id} onClick={() => { setSel(i); setDraft(JSON.parse(JSON.stringify(f))); }}
                  style={{ padding: "9px 10px", borderRadius: 10, cursor: "pointer", marginBottom: 6, background: i === sel && draft?.id ? "#fee2e2" : "#f9fafb", border: "1px solid " + (i === sel && draft?.id ? "#fca5a5" : "#f3f4f6") }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{f.emoji} {f.title}</div>
                      <div style={{ fontSize: 11, color: f.is_active ? "#16a34a" : "#9ca3af" }}>{f.is_active ? "● Ενεργή" : "○ Κλειστή"} · {f.route === "review" ? "πρώτα σε μένα" : "στους παραγωγούς"}</div>
                    </div>
                    <button title={f.is_active ? "Κλείσιμο στην εφαρμογή" : "Άνοιγμα στην εφαρμογή"} disabled={busy === "t" + f.id}
                      onClick={e => { e.stopPropagation(); toggleActive(f); }}
                      style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, background: f.is_active ? "#22c55e" : "#d1d5db" }}>
                      <span style={{ position: "absolute", top: 3, left: f.is_active ? 21 : 3, width: 16, height: 16, borderRadius: 8, background: "white", transition: "left .15s" }} />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => { setSel(-1); setDraft(newForm()); }} style={{ ...btn("#111827"), width: "100%", marginTop: 6 }}>+ Νέα φόρμα</button>
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>Με τον διακόπτη ανοίγεις/κλείνεις μια φόρμα αμέσως· οι κλειστές μένουν αποθηκευμένες. Με μία ανοιχτή, το κουμπί 🎵 την ανοίγει κατευθείαν· με περισσότερες, ο ακροατής διαλέγει· με καμία, γράφει «Δεν υπάρχει ανοιχτή φόρμα».</p>
            </div>

            {draft && previewCard && (
              <div style={{ flex: "1 1 640px", minWidth: 520 }}>
                <div style={card}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, flex: 1 }}>{draft.id ? "Επεξεργασία φόρμας" : "Νέα φόρμα"}</h2>
                    <label style={{ fontSize: 13, fontWeight: 700, color: draft.is_active ? "#16a34a" : "#6b7280", cursor: "pointer" }}>
                      <input type="checkbox" checked={draft.is_active} onChange={e => set({ is_active: e.target.checked })} /> Ενεργή στην εφαρμογή (μετά την Αποθήκευση)</label>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 10 }}>
                    <div><span style={lab}>Emoji</span><input style={{ ...input, textAlign: "center", fontSize: 18 }} value={draft.emoji} maxLength={4} onChange={e => set({ emoji: e.target.value })} /></div>
                    <div><span style={lab}>Τίτλος</span><input style={input} value={draft.title} maxLength={60} onChange={e => set({ title: e.target.value })} /></div>
                  </div>
                  <span style={lab}>Υπότιτλος</span><input style={input} value={draft.subtitle} maxLength={140} onChange={e => set({ subtitle: e.target.value })} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 10 }}>
                    <div><span style={lab}>Κουμπί αποστολής</span><input style={input} value={draft.button_text} maxLength={30} onChange={e => set({ button_text: e.target.value })} /></div>
                    <div><span style={lab}>Μήνυμα μετά την αποστολή</span><input style={input} value={draft.done_text} maxLength={100} onChange={e => set({ done_text: e.target.value })} /></div>
                    <div><span style={lab}>Σειρά</span><input type="number" style={input} value={draft.sort_order} onChange={e => set({ sort_order: Number(e.target.value) || 0 })} /></div>
                  </div>
                  <span style={lab}>Πού πηγαίνουν οι απαντήσεις</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([["review", "⏳ Πρώτα σε μένα (Εισερχόμενα)"], ["producers", "🎙️ Κατευθείαν στους παραγωγούς"]] as const).map(([v, l]) => (
                      <button key={v} onClick={() => set({ route: v })} style={btn(draft.route === v ? "#dc2626" : "#f3f4f6", draft.route === v ? "white" : "#374151")}>{l}</button>
                    ))}
                  </div>
                </div>

                <div style={card}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>Κελιά</h2>
                  {draft.fields.map((f, i) => (
                    <div key={f.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, marginBottom: 8, background: "#fafafa" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 170px 130px auto", gap: 8, alignItems: "end" }}>
                        <div><span style={lab}>Όνομα κελιού</span><input style={input} value={f.label} maxLength={50} onChange={e => setField(i, { label: e.target.value })} /></div>
                        <div><span style={lab}>Είδος</span><select style={input} value={f.type} onChange={e => setField(i, { type: e.target.value as Field["type"] })}>{TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
                        <div><span style={lab} title="Βοηθάει τους παραγωγούς: το «Τραγούδι» βγαίνει πρώτο στη λίστα τους">Ρόλος</span><select style={input} value={f.role || ""} onChange={e => setField(i, { role: e.target.value as Field["role"] })}>{ROLES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => moveField(i, -1)} style={btn("#e5e7eb", "#374151")} title="Πάνω">↑</button>
                          <button onClick={() => moveField(i, 1)} style={btn("#e5e7eb", "#374151")} title="Κάτω">↓</button>
                          <button onClick={() => setDraft(d => d ? { ...d, fields: d.fields.filter((_, j) => j !== i) } : d)} style={btn("#fef2f2", "#dc2626")} title="Διαγραφή κελιού">✕</button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                        {f.type === "choice"
                          ? <div><span style={lab}>Επιλογές (χώρισέ τες με κόμμα)</span><input style={input} value={(f.options || []).join(", ")} onChange={e => setField(i, { options: e.target.value.split(",").map(s => s.trimStart()) })} /></div>
                          : <div><span style={lab}>Παράδειγμα μέσα στο κελί</span><input style={input} value={f.placeholder || ""} maxLength={80} onChange={e => setField(i, { placeholder: e.target.value })} /></div>}
                        <label style={{ fontSize: 13, paddingBottom: 8, cursor: "pointer" }}><input type="checkbox" checked={f.required} onChange={e => setField(i, { required: e.target.checked })} /> Υποχρεωτικό</label>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setDraft(d => d ? { ...d, fields: [...d.fields, { id: "f" + Date.now().toString(36), label: "", type: "text", required: false, placeholder: "", role: "" }] } : d)}
                    style={{ ...btn("white", "#374151"), border: "1px dashed #9ca3af", width: "100%" }}>+ Νέο κελί</button>
                </div>

                <div style={card}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>🎨 Σχέδιο κάρτας</h2>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>Έτσι φαίνεται η απάντηση όταν πατάς «💌 Κάρτα στην εφαρμογή». Πάτα ένα κελί από κάτω για να μπει η απάντησή του στη γραμμή που γράφεις.</p>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 300px" }}>
                      <span style={lab}>Έτοιμα χρώματα</span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {PALETTES.map((p, i) => <button key={i} onClick={() => setCard({ colors: p })} style={{ width: 46, height: 26, borderRadius: 8, border: "2px solid " + (JSON.stringify(p) === JSON.stringify(draft.card.colors) ? "#111827" : "transparent"), background: `linear-gradient(135deg, ${p.join(", ")})`, cursor: "pointer" }} />)}
                      </div>
                      <span style={lab}>Δικά μου χρώματα</span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {draft.card.colors.map((c, i) => <input key={i} type="color" value={c} onChange={e => setCard({ colors: draft.card.colors.map((x, j) => j === i ? e.target.value.toUpperCase() : x) })} style={{ width: 38, height: 32, border: "1px solid #e5e7eb", borderRadius: 8, padding: 2 }} />)}
                        {draft.card.colors.length < 3 && <button onClick={() => setCard({ colors: [...draft.card.colors, "#FFFFFF"] })} style={btn("#f3f4f6", "#374151")}>+</button>}
                        {draft.card.colors.length > 1 && <button onClick={() => setCard({ colors: draft.card.colors.slice(0, -1) })} style={btn("#f3f4f6", "#374151")}>−</button>}
                        <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>Γράμματα</span>
                        <input type="color" value={draft.card.text} onChange={e => setCard({ text: e.target.value.toUpperCase() })} style={{ width: 38, height: 32, border: "1px solid #e5e7eb", borderRadius: 8, padding: 2 }} />
                      </div>
                      {([["label", "Ετικέτα πάνω"], ["title", "Μεγάλο κείμενο"], ["subtitle", "Δεύτερη γραμμή"], ["message", "Μήνυμα (σε πλαίσιο)"], ["footer", "Κάτω γραμμή"]] as [keyof Card, string][]).map(([k, l]) => (
                        <div key={k}><span style={lab}>{l}</span>
                          <input style={input} value={String(draft.card[k] ?? "")} maxLength={160} onFocus={e => (focusRef.current = { key: k, el: e.currentTarget })} onChange={e => { focusRef.current = { key: k, el: e.currentTarget }; setCard({ [k]: e.target.value } as any); }} /></div>
                      ))}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {draft.fields.filter(f => f.label.trim()).map(f => <button key={f.id} onClick={() => insertTag(f.label.trim())} style={{ ...btn("#eef2ff", "#3730a3"), padding: "4px 9px", fontSize: 12 }}>+ {`{${f.label.trim()}}`}</button>)}
                      </div>
                      <span style={lab}>Πόσα δευτερόλεπτα μένει στην οθόνη: {draft.card.duration}</span>
                      <input type="range" min={5} max={60} value={draft.card.duration} onChange={e => setCard({ duration: Number(e.target.value) })} style={{ width: "100%" }} />
                    </div>
                    <div style={{ width: 300 }}>
                      <span style={lab}>Προεπισκόπηση (με παράδειγμα)</span>
                      <div style={{ background: "#050508", borderRadius: 24, padding: "40px 16px", minHeight: 300 }}><CardPreview c={previewCard} /></div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 40 }}>
                  <button disabled={busy === "save"} onClick={save} style={{ ...btn("#dc2626"), padding: "12px 22px", fontSize: 15 }}>{busy === "save" ? "Αποθήκευση…" : "💾 Αποθήκευση"}</button>
                  {draft.id && <button onClick={() => { const c = JSON.parse(JSON.stringify(draft)); delete c.id; c.title += " (αντίγραφο)"; c.is_active = false; setSel(-1); setDraft(c); }} style={btn("#f3f4f6", "#374151")}>📄 Αντίγραφο</button>}
                  {draft.id && <button onClick={remove} style={btn("#fef2f2", "#dc2626")}>🗑️ Διαγραφή φόρμας</button>}
                </div>
              </div>
            )}
          </div>
        )}

        {sendCard && (
          <div onClick={() => setSendCard(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 18, padding: 20, width: 720, maxWidth: "95vw", display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 300px" }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>💌 Κάρτα σε όλα τα κινητά</h2>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 6px" }}>Διόρθωσε ό,τι θέλεις πριν τη στείλεις.</p>
                {([["label", "Ετικέτα"], ["title", "Μεγάλο κείμενο"], ["subtitle", "Δεύτερη γραμμή"], ["message", "Μήνυμα"], ["footer", "Κάτω γραμμή"]] as [keyof Card, string][]).map(([k, l]) => (
                  <div key={k}><span style={lab}>{l}</span><input style={input} value={String(sendCard.c[k] ?? "")} maxLength={200} onChange={e => setSendCard(s => s ? { ...s, c: { ...s.c, [k]: e.target.value } } : s)} /></div>
                ))}
                <span style={lab}>Δευτερόλεπτα: {sendCard.c.duration}</span>
                <input type="range" min={5} max={60} value={sendCard.c.duration} onChange={e => setSendCard(s => s ? { ...s, c: { ...s.c, duration: Number(e.target.value) } } : s)} style={{ width: "100%" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button disabled={busy === "card"} onClick={showCard} style={{ ...btn("#16a34a"), padding: "11px 18px" }}>{busy === "card" ? "Αποστολή…" : "📲 Δείξ' τη σε όλους"}</button>
                  <button onClick={() => setSendCard(null)} style={btn("#f3f4f6", "#374151")}>Άκυρο</button>
                </div>
              </div>
              <div style={{ width: 290 }}><div style={{ background: "#050508", borderRadius: 22, padding: "36px 14px" }}><CardPreview c={sendCard.c} /></div></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
