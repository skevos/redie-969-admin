"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { adminDb, adminUpload } from '../lib/adminDb';
import Sidebar from "../components/Sidebar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Moment {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_active: boolean;
  sponsor_name: string | null;
  claims_count: number;
  max_claims: number | null;
}

export default function PresencePage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", start_at: "", end_at: "",
    sponsor_name: "", max_claims: "10"
  });
  const [openWins, setOpenWins] = useState<string | null>(null);
  const [wins, setWins] = useState<{ claim_no: number; code: string; created_at: string; device_id: string }[]>([]);
  const [winsLoading, setWinsLoading] = useState(false);
  const [checkCode, setCheckCode] = useState("");

  // local "YYYY-MM-DDTHH:mm" for datetime-local inputs
  const localDT = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const openForm = () => {
    const now = new Date();
    setFormData(f => ({ ...f, start_at: localDT(now), end_at: localDT(new Date(now.getTime() + 15 * 60000)) }));
    setShowForm(true);
  };

  const toggleWins = async (id: string) => {
    if (openWins === id) { setOpenWins(null); return; }
    setOpenWins(id); setWins([]); setWinsLoading(true); setCheckCode("");
    try {
      const r = await fetch(`/api/admin/moment-wins?id=${id}`, { credentials: "same-origin" });
      const j = await r.json();
      setWins(j.wins || []);
    } catch { setWins([]); }
    setWinsLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data: momentsData } = await supabase
        .from("presence_moments")
        .select("*")
        .order("start_at", { ascending: false })
        .limit(20);
      setMoments(momentsData || []);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createMoment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminDb.from("presence_moments").update({ is_active: false }).eq("is_active", true);
      const { error } = await adminDb.from("presence_moments").insert({
        title: formData.title,
        description: formData.description || null,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: new Date(formData.end_at).toISOString(),
        sponsor_name: formData.sponsor_name || null,
        max_claims: formData.max_claims ? parseInt(formData.max_claims) : null,
        is_active: true
      });
      if (error) {
        alert("Σφάλμα: " + error.message);
        return;
      }
      setShowForm(false);
      setFormData({ title: "", description: "", start_at: "", end_at: "", sponsor_name: "", max_claims: "10" });
      loadData();
    } catch (e) {
      alert("Σφάλμα");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (m: Moment) => {
    if (!m.is_active) {
      await adminDb.from("presence_moments").update({ is_active: false }).neq("id", m.id);
    }
    const { error } = await adminDb.from("presence_moments").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) alert("Σφάλμα: " + error.message);
    loadData();
  };

  const deleteMoment = async (id: string) => {
    if (!confirm("Διαγραφή;")) return;
    await adminDb.from("presence_moments").delete().eq("id", id);
    loadData();
  };

  const formatDT = (iso: string) => new Date(iso).toLocaleString("el-GR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
  });

  const getStatus = (m: Moment) => {
    const now = new Date();
    if (!m.is_active) return { label: "Ανενεργό", bg: "#6b7280" };
    if (now < new Date(m.start_at)) return { label: "Προγραμματισμένο", bg: "#3b82f6" };
    if (now > new Date(m.end_at)) return { label: "Ολοκληρώθηκε", bg: "#6b7280" };
    return { label: "LIVE", bg: "#22c55e" };
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: 32 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1f2937", margin: 0 }}>🎁 Moments</h1>
              <p style={{ color: "#6b7280", margin: "4px 0 0" }}>Δώρα χορηγών στην εφαρμογή: οι πρώτοι που πατάνε «Το θέλω!» κερδίζουν και παίρνουν κωδικό</p>
            </div>
            <button onClick={openForm} style={{
              background: "#8b5cf6", color: "white", border: "none", padding: "12px 24px",
              borderRadius: 12, fontWeight: 600, cursor: "pointer"
            }}>+ Νέο Moment</button>
          </div>

          <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 16, padding: 20, marginBottom: 24, color: "#4c1d95", fontSize: 14, lineHeight: 1.7 }}>
            <b>Πώς δουλεύει:</b> 1) «+ Νέο Moment» → γράφεις το δώρο, τον χορηγό και πόσοι κερδίζουν. Ξεκινά αμέσως (15′ προεπιλογή).
            2) Το λες στον αέρα: «ανοίξτε την εφαρμογή, οι 10 πρώτοι κερδίζουν!». 3) Στην αρχική της εφαρμογής βγαίνει κάρτα με κουμπί «Το θέλω!».
            4) Όποιος προλάβει παίρνει κωδικό (π.χ. 7F3A9C) και τον δείχνει στον χορηγό. 5) Εδώ πατάς «🏆 Νικητές» για να ελέγξεις τους κωδικούς.
            Ένα κινητό = μία νίκη.
          </div>

          <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1f2937", margin: 0 }}>Moments</h2>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Φόρτωση...</div>
            ) : moments.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Δεν υπάρχουν moments</div>
            ) : (
              moments.map(m => {
                const status = getStatus(m);
                return (
                  <div key={m.id}>
                  <div style={{ padding: 24, borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: "#1f2937" }}>{m.title}</span>
                        <span style={{ background: status.bg, color: "white", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{status.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#6b7280" }}>
                        <span>🕐 {formatDT(m.start_at)} - {formatDT(m.end_at)}</span>
                        <span>🏆 {m.claims_count}{m.max_claims ? ` / ${m.max_claims}` : ""} νικητές</span>
                        {m.sponsor_name && <span>🤝 {m.sponsor_name}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => toggleWins(m.id)} style={{
                        background: "#fef3c7", color: "#92400e", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600
                      }}>🏆 Νικητές</button>
                      <button onClick={() => toggleActive(m)} style={{
                        background: m.is_active ? "#ef4444" : "#22c55e", color: "white",
                        border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500
                      }}>{m.is_active ? "Απενεργοποίηση" : "Ενεργοποίηση"}</button>
                      <button onClick={() => deleteMoment(m.id)} style={{
                        background: "#f3f4f6", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer"
                      }}>🗑️</button>
                    </div>
                  </div>
                  {openWins === m.id && (
                    <div style={{ padding: "16px 24px 24px", background: "#fffbeb", borderBottom: "1px solid #f3f4f6" }}>
                      <input value={checkCode} onChange={e => setCheckCode(e.target.value.toUpperCase().trim())} placeholder="Έλεγχος κωδικού (π.χ. 7F3A9C)"
                        style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, width: 280, marginBottom: 8, fontFamily: "monospace" }} />
                      {checkCode.length >= 4 && (
                        <span style={{ marginLeft: 12, fontWeight: 700, color: wins.some(w => w.code === checkCode) ? "#16a34a" : "#dc2626" }}>
                          {wins.some(w => w.code === checkCode) ? "✅ Έγκυρος κωδικός" : "❌ Δεν βρέθηκε"}
                        </span>
                      )}
                      {winsLoading ? <div style={{ color: "#6b7280" }}>Φόρτωση...</div> : wins.length === 0 ? (
                        <div style={{ color: "#6b7280" }}>Κανένας νικητής ακόμα.</div>
                      ) : (
                        <table style={{ borderCollapse: "collapse", fontSize: 14, marginTop: 4 }}>
                          <thead><tr style={{ color: "#6b7280", textAlign: "left" }}><th style={{ padding: "4px 16px 4px 0" }}>#</th><th style={{ padding: "4px 16px 4px 0" }}>Κωδικός</th><th style={{ padding: "4px 16px 4px 0" }}>Ώρα</th><th>Κινητό</th></tr></thead>
                          <tbody>{wins.map(w => (
                            <tr key={w.claim_no} style={{ background: w.code === checkCode ? "#bbf7d0" : undefined }}>
                              <td style={{ padding: "4px 16px 4px 0" }}>{w.claim_no}</td>
                              <td style={{ padding: "4px 16px 4px 0", fontFamily: "monospace", fontWeight: 700, letterSpacing: 2 }}>{w.code}</td>
                              <td style={{ padding: "4px 16px 4px 0" }}>{new Date(w.created_at).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                              <td style={{ color: "#9ca3af" }}>…{w.device_id}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      )}
                    </div>
                  )}
                  </div>
                );
              })
            )}
          </div>

          {showForm && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
              <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 480, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Νέο Moment</h2>
                  <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
                </div>
                <form onSubmit={createMoment}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, color: "#374151", marginBottom: 6 }}>Δώρο * (π.χ. «Κέρδισε 2 καφέδες»)</label>
                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                      style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, color: "#374151", marginBottom: 6 }}>Περιγραφή</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                      style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} rows={2} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 14, color: "#374151", marginBottom: 6 }}>Έναρξη *</label>
                      <input type="datetime-local" required value={formData.start_at} onChange={e => setFormData({...formData, start_at: e.target.value})}
                        style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 14, color: "#374151", marginBottom: 6 }}>Λήξη *</label>
                      <input type="datetime-local" required value={formData.end_at} onChange={e => setFormData({...formData, end_at: e.target.value})}
                        style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 14, color: "#374151", marginBottom: 6 }}>Χορηγός</label>
                      <input value={formData.sponsor_name} onChange={e => setFormData({...formData, sponsor_name: e.target.value})}
                        style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 14, color: "#374151", marginBottom: 6 }}>Πόσοι κερδίζουν</label>
                      <input type="number" value={formData.max_claims} onChange={e => setFormData({...formData, max_claims: e.target.value})}
                        style={{ width: "100%", padding: 12, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }} placeholder="Απεριόριστο" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="button" onClick={() => setShowForm(false)} style={{
                      flex: 1, padding: 14, background: "#f3f4f6", border: "none", borderRadius: 10, fontWeight: 500, cursor: "pointer"
                    }}>Ακύρωση</button>
                    <button type="submit" disabled={creating} style={{
                      flex: 1, padding: 14, background: "#8b5cf6", color: "white", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer"
                    }}>{creating ? "..." : "Δημιουργία"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
