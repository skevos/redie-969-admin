"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
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
  const [stats, setStats] = useState({ profiles: 0, sessions: 0, pushes: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", start_at: "", end_at: "",
    sponsor_name: "", max_claims: ""
  });

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

      const today = new Date().toISOString().split("T")[0];
      const [{ count: profiles }, { count: sessions }] = await Promise.all([
        supabase.from("presence_profile").select("*", { count: "exact", head: true }),
        supabase.from("presence_sessions").select("*", { count: "exact", head: true })
          .gte("started_at", `${today}T00:00:00`)
      ]);
      setStats({ profiles: profiles || 0, sessions: sessions || 0, pushes: 0 });
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
      await supabase.from("presence_moments").insert({
        title: formData.title,
        description: formData.description || null,
        start_at: formData.start_at,
        end_at: formData.end_at,
        sponsor_name: formData.sponsor_name || null,
        max_claims: formData.max_claims ? parseInt(formData.max_claims) : null,
        is_active: false
      });
      setShowForm(false);
      setFormData({ title: "", description: "", start_at: "", end_at: "", sponsor_name: "", max_claims: "" });
      loadData();
    } catch (e) {
      alert("Σφάλμα");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (m: Moment) => {
    if (!m.is_active) {
      await supabase.from("presence_moments").update({ is_active: false }).neq("id", m.id);
    }
    await supabase.from("presence_moments").update({ is_active: !m.is_active }).eq("id", m.id);
    loadData();
  };

  const deleteMoment = async (id: string) => {
    if (!confirm("Διαγραφή;")) return;
    await supabase.from("presence_moments").delete().eq("id", id);
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
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1f2937", margin: 0 }}>📡 Radio Presence Mode™</h1>
              <p style={{ color: "#6b7280", margin: "4px 0 0" }}>Διαχείριση moments & analytics</p>
            </div>
            <button onClick={() => setShowForm(true)} style={{
              background: "#8b5cf6", color: "white", border: "none", padding: "12px 24px",
              borderRadius: 12, fontWeight: 600, cursor: "pointer"
            }}>+ Νέο Moment</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
            <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Συνολικά Profiles</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: "#1f2937", margin: "8px 0 0" }}>{stats.profiles}</p>
            </div>
            <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Sessions Σήμερα</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: "#22c55e", margin: "8px 0 0" }}>{stats.sessions}</p>
            </div>
            <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Active Moments</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: "#8b5cf6", margin: "8px 0 0" }}>{moments.filter(m => m.is_active).length}</p>
            </div>
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
                  <div key={m.id} style={{ padding: 24, borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: "#1f2937" }}>{m.title}</span>
                        <span style={{ background: status.bg, color: "white", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{status.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#6b7280" }}>
                        <span>🕐 {formatDT(m.start_at)} - {formatDT(m.end_at)}</span>
                        <span>👥 {m.claims_count} claims</span>
                        {m.sponsor_name && <span>🤝 {m.sponsor_name}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => toggleActive(m)} style={{
                        background: m.is_active ? "#ef4444" : "#22c55e", color: "white",
                        border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 500
                      }}>{m.is_active ? "Απενεργοποίηση" : "Ενεργοποίηση"}</button>
                      <button onClick={() => deleteMoment(m.id)} style={{
                        background: "#f3f4f6", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer"
                      }}>🗑️</button>
                    </div>
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
                    <label style={{ display: "block", fontSize: 14, color: "#374151", marginBottom: 6 }}>Τίτλος *</label>
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
                      <label style={{ display: "block", fontSize: 14, color: "#374151", marginBottom: 6 }}>Max Claims</label>
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
