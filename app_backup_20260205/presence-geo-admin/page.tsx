"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FLAGS: { [key: string]: string } = {
  'GR': '🇬🇷', 'US': '🇺🇸', 'DE': '🇩🇪', 'AU': '🇦🇺', 'CY': '🇨🇾',
  'UK': '🇬🇧', 'CA': '🇨🇦', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸'
};

interface BoostItem {
  id: string;
  country_code: string;
  country: string;
  city: string;
  boost_listeners: number;
  is_active: boolean;
}

export default function PresenceGeoAdminPage() {
  const [boosts, setBoosts] = useState<BoostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCity, setNewCity] = useState({ country_code: 'GR', country: 'Greece', city: '', boost_listeners: 0 });

  useEffect(() => {
    loadBoosts();
  }, []);

  const loadBoosts = async () => {
    try {
      const { data } = await supabase
        .from('presence_geo_boost')
        .select('*')
        .order('country', { ascending: true })
        .order('city', { ascending: true });
      setBoosts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateBoost = async (id: string, boost_listeners: number) => {
    await supabase
      .from('presence_geo_boost')
      .update({ boost_listeners, updated_at: new Date().toISOString() })
      .eq('id', id);
    loadBoosts();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase
      .from('presence_geo_boost')
      .update({ is_active: !is_active })
      .eq('id', id);
    loadBoosts();
  };

  const addCity = async () => {
    if (!newCity.city) return;
    await supabase.from('presence_geo_boost').insert({
      country_code: newCity.country_code,
      country: newCity.country,
      city: newCity.city,
      boost_listeners: newCity.boost_listeners,
      is_active: true
    });
    setNewCity({ country_code: 'GR', country: 'Greece', city: '', boost_listeners: 0 });
    setShowAdd(false);
    loadBoosts();
  };

  const deleteCity = async (id: string) => {
    if (!confirm('Διαγραφή;')) return;
    await supabase.from('presence_geo_boost').delete().eq('id', id);
    loadBoosts();
  };

  const getFlag = (code: string) => FLAGS[code] || '🌍';

  const totalBoost = boosts.filter(b => b.is_active).reduce((sum, b) => sum + b.boost_listeners, 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: 32 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "white", margin: 0 }}>⚙️ Geo Boost Admin</h1>
              <p style={{ color: "#64748b", margin: "4px 0 0" }}>Ρύθμιση fake listeners ανά περιοχή</p>
            </div>
            <button 
              onClick={() => setShowAdd(true)}
              style={{ background: "#8b5cf6", color: "white", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 600, cursor: "pointer" }}
            >
              + Νέα Πόλη
            </button>
          </div>

          {/* Total Boost */}
          <div style={{ background: "#1e293b", borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>ΣΥΝΟΛΙΚΟ BOOST</p>
                <p style={{ color: "#f59e0b", fontSize: 48, fontWeight: 700, margin: "8px 0 0" }}>+{totalBoost}</p>
              </div>
              <div style={{ color: "#64748b", fontSize: 14 }}>
                <p style={{ margin: 0 }}>Ενεργές πόλεις: {boosts.filter(b => b.is_active).length}</p>
                <p style={{ margin: "4px 0 0" }}>Συνολικές πόλεις: {boosts.length}</p>
              </div>
            </div>
          </div>

          {/* Boost List */}
          <div style={{ background: "#1e293b", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #334155", display: "grid", gridTemplateColumns: "50px 1fr 1fr 150px 100px 80px", gap: 16, color: "#64748b", fontSize: 12, fontWeight: 600 }}>
              <span></span>
              <span>ΧΩΡΑ</span>
              <span>ΠΟΛΗ</span>
              <span>BOOST LISTENERS</span>
              <span>STATUS</span>
              <span></span>
            </div>
            
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Φόρτωση...</div>
            ) : boosts.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Δεν υπάρχουν πόλεις</div>
            ) : (
              boosts.map((b) => (
                <div key={b.id} style={{ padding: "16px 24px", borderBottom: "1px solid #1e293b", display: "grid", gridTemplateColumns: "50px 1fr 1fr 150px 100px 80px", gap: 16, alignItems: "center", background: b.is_active ? "transparent" : "#0f172a" }}>
                  <span style={{ fontSize: 24 }}>{getFlag(b.country_code)}</span>
                  <span style={{ color: "white" }}>{b.country}</span>
                  <span style={{ color: "white", fontWeight: 500 }}>{b.city}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button 
                      onClick={() => updateBoost(b.id, Math.max(0, b.boost_listeners - 5))}
                      style={{ width: 32, height: 32, background: "#ef4444", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16 }}
                    >-</button>
                    <input
                      type="number"
                      value={b.boost_listeners}
                      onChange={(e) => updateBoost(b.id, parseInt(e.target.value) || 0)}
                      style={{ width: 60, padding: "8px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f59e0b", textAlign: "center", fontWeight: 700 }}
                    />
                    <button 
                      onClick={() => updateBoost(b.id, b.boost_listeners + 5)}
                      style={{ width: 32, height: 32, background: "#22c55e", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16 }}
                    >+</button>
                  </div>
                  <button
                    onClick={() => toggleActive(b.id, b.is_active)}
                    style={{ padding: "6px 12px", background: b.is_active ? "#22c55e" : "#64748b", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12 }}
                  >
                    {b.is_active ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => deleteCity(b.id)}
                    style={{ padding: "6px 12px", background: "transparent", color: "#ef4444", border: "none", cursor: "pointer" }}
                  >🗑️</button>
                </div>
              ))
            )}
          </div>

          {/* Add Modal */}
          {showAdd && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
              <div style={{ background: "#1e293b", borderRadius: 20, padding: 24, width: 400 }}>
                <h2 style={{ color: "white", fontSize: 20, margin: "0 0 20px 0" }}>Νέα Πόλη</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ color: "#64748b", fontSize: 12, display: "block", marginBottom: 4 }}>Κωδικός Χώρας</label>
                    <select
                      value={newCity.country_code}
                      onChange={(e) => {
                        const code = e.target.value;
                        const countries: {[k:string]:string} = { 'GR': 'Greece', 'US': 'United States', 'DE': 'Germany', 'AU': 'Australia', 'CY': 'Cyprus', 'UK': 'United Kingdom', 'CA': 'Canada' };
                        setNewCity({ ...newCity, country_code: code, country: countries[code] || code });
                      }}
                      style={{ width: "100%", padding: 12, background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "white" }}
                    >
                      <option value="GR">🇬🇷 Greece</option>
                      <option value="US">🇺🇸 United States</option>
                      <option value="DE">🇩🇪 Germany</option>
                      <option value="AU">🇦🇺 Australia</option>
                      <option value="CY">🇨🇾 Cyprus</option>
                      <option value="UK">🇬🇧 United Kingdom</option>
                      <option value="CA">🇨🇦 Canada</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: "#64748b", fontSize: 12, display: "block", marginBottom: 4 }}>Πόλη</label>
                    <input
                      value={newCity.city}
                      onChange={(e) => setNewCity({ ...newCity, city: e.target.value })}
                      placeholder="π.χ. Kalymnos"
                      style={{ width: "100%", padding: 12, background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "white" }}
                    />
                  </div>
                  <div>
                    <label style={{ color: "#64748b", fontSize: 12, display: "block", marginBottom: 4 }}>Boost Listeners</label>
                    <input
                      type="number"
                      value={newCity.boost_listeners}
                      onChange={(e) => setNewCity({ ...newCity, boost_listeners: parseInt(e.target.value) || 0 })}
                      style={{ width: "100%", padding: 12, background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "white" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 14, background: "#334155", color: "white", border: "none", borderRadius: 10, cursor: "pointer" }}>Ακύρωση</button>
                    <button onClick={addCity} style={{ flex: 1, padding: 14, background: "#8b5cf6", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Προσθήκη</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
