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
  'UK': '🇬🇧', 'GB': '🇬🇧', 'CA': '🇨🇦', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸',
  'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭', 'AT': '🇦🇹', 'SE': '🇸🇪',
  'Ελλάδα': '🇬🇷', 'Ηνωμένες Πολιτείες': '🇺🇸', 'Γερμανία': '🇩🇪',
  'Αυστραλία': '🇦🇺', 'Κύπρος': '🇨🇾', 'Γαλλία': '🇫🇷', 'Ιταλία': '🇮🇹',
  'Ισπανία': '🇪🇸', 'Καναδάς': '🇨🇦', 'Ηνωμένο Βασίλειο': '🇬🇧',
  'Ολλανδία': '🇳🇱', 'Βέλγιο': '🇧🇪', 'Ελβετία': '🇨🇭', 'Αυστρία': '🇦🇹',
  'Σουηδία': '🇸🇪',
  'Greece': '🇬🇷', 'United States': '🇺🇸', 'Germany': '🇩🇪',
  'Australia': '🇦🇺', 'Cyprus': '🇨🇾', 'France': '🇫🇷', 'Italy': '🇮🇹',
  'Spain': '🇪🇸', 'Canada': '🇨🇦', 'United Kingdom': '🇬🇧',
  'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Switzerland': '🇨🇭', 'Austria': '🇦🇹',
  'Sweden': '🇸🇪',
};

export default function PresenceGeoPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data: geoData, error } = await fetch('/api/admin/rpc?name=get_presence_geo_boosted', { credentials: 'same-origin' }).then(r => r.json()).catch(() => ({ data: null, error: { message: 'network' } }));
      if (error) console.error('RPC error:', error);
      if (geoData) setData(geoData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getFlag = (code: string) => FLAGS[code] || '🌍';

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: 32 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "white", margin: 0 }}>🌍 Geo Listeners</h1>
            <p style={{ color: "#64748b", margin: "4px 0 0" }}>Live & σημερινοί ακροατές ανά περιοχή</p>
          </div>

          {loading ? (
            <p style={{ color: "#64748b", textAlign: "center", padding: 60 }}>Φόρτωση...</p>
          ) : (
            <>
              {/* Top Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                
                {/* Live Now Card */}
                <div style={{ 
                  background: "linear-gradient(135deg, #16a34a22 0%, #0f172a 100%)", 
                  borderRadius: 20, padding: 32,
                  border: "1px solid #16a34a55"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ color: "#4ade80", fontSize: 14, margin: 0, fontWeight: 600 }}>🔴 LIVE ΤΩΡΑ</p>
                      <p style={{ color: "white", fontSize: 56, fontWeight: 700, margin: "8px 0 0" }}>
                        {data?.live_total || 0}
                      </p>
                      <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>ακούνε αυτή τη στιγμή</p>
                    </div>
                    <div style={{ 
                      width: 16, height: 16, borderRadius: "50%", 
                      background: (data?.live_total || 0) > 0 ? "#ef4444" : "#475569",
                      boxShadow: (data?.live_total || 0) > 0 ? "0 0 20px #ef4444, 0 0 40px #ef444488" : "none",
                      animation: (data?.live_total || 0) > 0 ? "pulse 2s infinite" : "none"
                    }} />
                  </div>
                </div>

                {/* Today Total Card */}
                <div style={{ 
                  background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)", 
                  borderRadius: 20, padding: 32,
                  border: "1px solid #1e40af"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ color: "#64748b", fontSize: 14, margin: 0, fontWeight: 600 }}>🎧 ΣΗΜΕΡΑ ΣΥΝΟΛΟ</p>
                      <p style={{ color: "white", fontSize: 56, fontWeight: 700, margin: "8px 0 0" }}>
                        {data?.totals?.total_listeners || 0}
                      </p>
                      <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>μοναδικοί ακροατές</p>
                    </div>
                    <div style={{ fontSize: 60, opacity: 0.15 }}>🌍</div>
                  </div>
                </div>
              </div>

              {/* Live Listeners by Location */}
              {(data?.live?.length > 0) && (
                <div style={{ background: "#1e293b", borderRadius: 16, padding: 24, marginBottom: 24, border: "1px solid #16a34a33" }}>
                  <h3 style={{ color: "#4ade80", fontSize: 18, margin: "0 0 20px 0" }}>🔴 Live Ακροατές ανά Περιοχή</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    {data.live.map((loc: any, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0f172a", borderRadius: 10, border: "1px solid #16a34a22" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{getFlag(loc.country_code || loc.country)}</span>
                          <span style={{ color: "white", fontSize: 14 }}>{loc.city}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                          <span style={{ color: "#4ade80", fontWeight: 700 }}>{loc.listeners}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                
                {/* By Country */}
                <div style={{ background: "#1e293b", borderRadius: 16, padding: 24 }}>
                  <h3 style={{ color: "white", fontSize: 18, margin: "0 0 20px 0" }}>🏳️ Σήμερα ανά Χώρα</h3>
                  {data?.by_country?.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {data.by_country.map((c: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0f172a", borderRadius: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 24 }}>{getFlag(c.country_code || c.country)}</span>
                            <span style={{ color: "white", fontWeight: 500 }}>{c.country || c.country_code}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 18 }}>{c.listeners}</span>
                            <span style={{ color: "#64748b", fontSize: 12 }}>ακροατές</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>Δεν υπάρχουν δεδομένα σήμερα</p>
                  )}
                </div>

                {/* Greek Cities */}
                <div style={{ background: "#1e293b", borderRadius: 16, padding: 24 }}>
                  <h3 style={{ color: "white", fontSize: 18, margin: "0 0 20px 0" }}>🇬🇷 Ελλάδα - Πόλεις</h3>
                  {data?.greek_islands?.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {data.greek_islands.map((city: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#0f172a", borderRadius: 10 }}>
                          <span style={{ color: "white" }}>{city.city}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: city.listeners > 0 ? "#3b82f6" : "#475569", fontWeight: 700 }}>{city.listeners}</span>
                            <span style={{ color: "#64748b", fontSize: 11 }}>listeners</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>Δεν υπάρχουν δεδομένα</p>
                  )}
                </div>

              </div>

              {/* All Cities Today */}
              <div style={{ background: "#1e293b", borderRadius: 16, padding: 24, marginTop: 24 }}>
                <h3 style={{ color: "white", fontSize: 18, margin: "0 0 20px 0" }}>🏙️ Όλες οι Πόλεις Σήμερα</h3>
                {data?.by_city?.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    {data.by_city.map((city: any, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0f172a", borderRadius: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{getFlag(city.country_code || city.country)}</span>
                          <span style={{ color: "white", fontSize: 14 }}>{city.city}</span>
                        </div>
                        <span style={{ color: "#22c55e", fontWeight: 600 }}>{city.listeners}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>Δεν υπάρχουν δεδομένα σήμερα</p>
                )}
              </div>
            </>
          )}

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>

        </div>
      </main>
    </div>
  );
}
