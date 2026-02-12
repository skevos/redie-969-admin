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
  'UK': '🇬🇧', 'CA': '🇨🇦', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸',
  'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭', 'AT': '🇦🇹', 'SE': '🇸🇪'
};

export default function PresenceGeoPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data: geoData } = await supabase.rpc('get_presence_geo_boosted');
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
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "white", margin: 0 }}>🌍 Geo Analytics</h1>
            <p style={{ color: "#64748b", margin: "4px 0 0" }}>Listeners ανά περιοχή</p>
          </div>

          {/* Total Card */}
          <div style={{ 
            background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)", 
            borderRadius: 20, padding: 32, marginBottom: 24,
            border: "1px solid #1e40af"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>🎧 ΣΥΝΟΛΙΚΟΙ ΑΚΡΟΑΤΕΣ</p>
                <p style={{ color: "white", fontSize: 64, fontWeight: 700, margin: "8px 0 0" }}>
                  {data?.totals?.total_listeners || 0}
                </p>
              </div>
              <div style={{ fontSize: 80, opacity: 0.2 }}>🌍</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            
            {/* By Country */}
            <div style={{ background: "#1e293b", borderRadius: 16, padding: 24 }}>
              <h3 style={{ color: "white", fontSize: 18, margin: "0 0 20px 0" }}>🏳️ Ανά Χώρα</h3>
              {data?.by_country?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data.by_country.map((c: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0f172a", borderRadius: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 24 }}>{getFlag(c.country_code)}</span>
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
                <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>Δεν υπάρχουν δεδομένα</p>
              )}
            </div>

            {/* Greek Islands */}
            <div style={{ background: "#1e293b", borderRadius: 16, padding: 24 }}>
              <h3 style={{ color: "white", fontSize: 18, margin: "0 0 20px 0" }}>🇬🇷 Ελλάδα - Πόλεις</h3>
              {data?.greek_islands?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.greek_islands.map((city: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#0f172a", borderRadius: 10 }}>
                      <span style={{ color: "white" }}>{city.city}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#3b82f6", fontWeight: 700 }}>{city.listeners}</span>
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

          {/* All Cities */}
          <div style={{ background: "#1e293b", borderRadius: 16, padding: 24, marginTop: 24 }}>
            <h3 style={{ color: "white", fontSize: 18, margin: "0 0 20px 0" }}>🏙️ Όλες οι Πόλεις</h3>
            {data?.by_city?.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {data.by_city.map((city: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0f172a", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{getFlag(city.country_code)}</span>
                      <span style={{ color: "white", fontSize: 14 }}>{city.city}</span>
                    </div>
                    <span style={{ color: "#22c55e", fontWeight: 600 }}>{city.listeners}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>Δεν υπάρχουν δεδομένα</p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
