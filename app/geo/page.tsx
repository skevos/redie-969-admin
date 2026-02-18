"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

interface CountryStats {
  country: string;
  count: number;
  iosCount: number;
  androidCount: number;
  cities: { city: string; count: number }[];
}

export default function GeoAnalyticsPage() {
  const [stats, setStats] = useState<CountryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCountry, setExpandedCountry] = useState<string | null>('Greece');
  const [totalIos, setTotalIos] = useState(0);
  const [totalAndroid, setTotalAndroid] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const { data: tokens } = await supabase.from('fcm_tokens').select('country, city, region, platform');
      
      if (tokens) {
        const countryMap = new Map<string, { count: number; iosCount: number; androidCount: number; cities: Map<string, number> }>();
        let ios = 0, android = 0;
        
        tokens.forEach(t => {
          if (t.platform === 'ios') ios++; else android++;
          if (t.country) {
            if (!countryMap.has(t.country)) {
              countryMap.set(t.country, { count: 0, iosCount: 0, androidCount: 0, cities: new Map() });
            }
            const countryData = countryMap.get(t.country)!;
            countryData.count++;
            if (t.platform === 'ios') countryData.iosCount++; else countryData.androidCount++;
            
            if (t.city) {
              countryData.cities.set(t.city, (countryData.cities.get(t.city) || 0) + 1);
            }
          }
        });
        
        setTotalIos(ios);
        setTotalAndroid(android);
        
        const statsArray: CountryStats[] = Array.from(countryMap.entries())
          .map(([country, data]) => ({
            country,
            count: data.count,
            iosCount: data.iosCount,
            androidCount: data.androidCount,
            cities: Array.from(data.cities.entries())
              .map(([city, count]) => ({ city, count }))
              .sort((a, b) => b.count - a.count)
          }))
          .sort((a, b) => b.count - a.count);
        
        setStats(statsArray);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  const totalDevices = stats.reduce((sum, s) => sum + s.count, 0);

  const countryFlags: Record<string, string> = {
    'Greece': '🇬🇷', 'United States': '🇺🇸', 'Australia': '🇦🇺', 'Germany': '🇩🇪',
    'United Kingdom': '🇬🇧', 'France': '🇫🇷', 'Italy': '🇮🇹', 'Spain': '🇪🇸',
    'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Switzerland': '🇨🇭', 'Austria': '🇦🇹',
    'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮',
    'Poland': '🇵🇱', 'Czech Republic': '🇨🇿', 'Portugal': '🇵🇹', 'Ireland': '🇮🇪',
    'Cyprus': '🇨🇾', 'Canada': '🇨🇦', 'Brasil': '🇧🇷', 'Brazil': '🇧🇷',
    'Turkey': '🇹🇷', 'Bulgaria': '🇧🇬', 'Romania': '🇷🇴', 'Albania': '🇦🇱',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#1f2937' }}>🌍 Geo Analytics</h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Συσκευές ανά χώρα και περιοχή</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ background: '#f0fdf4', padding: '8px 16px', borderRadius: 10, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#166534' }}>{totalAndroid}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>🤖 Android</p>
            </div>
            <div style={{ background: '#eff6ff', padding: '8px 16px', borderRadius: 10, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e40af' }}>{totalIos}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>🍎 iOS</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #E53935 0%, #c62828 100%)', color: 'white', padding: '8px 20px', borderRadius: 10, fontWeight: 700, fontSize: 18 }}>
              📱 {totalDevices}
            </div>
          </div>
        </header>

        <div style={{ padding: 32 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ width: 50, height: 50, border: '4px solid #e53935', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
            </div>
          ) : stats.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 16, padding: 60, textAlign: 'center' }}>
              <span style={{ fontSize: 64 }}>🌍</span>
              <p style={{ color: '#6b7280', marginTop: 16 }}>Δεν υπάρχουν δεδομένα τοποθεσίας</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Countries List */}
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>📊 Χώρες</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.map((stat, i) => {
                    const percentage = Math.round((stat.count / totalDevices) * 100);
                    const isExpanded = expandedCountry === stat.country;
                    return (
                      <div key={i}>
                        <div 
                          onClick={() => setExpandedCountry(isExpanded ? null : stat.country)}
                          style={{ 
                            background: isExpanded ? 'rgba(229,57,53,0.1)' : '#f9fafb', 
                            borderRadius: 12, 
                            padding: 16, 
                            cursor: 'pointer',
                            border: isExpanded ? '2px solid #E53935' : '2px solid transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontSize: 24 }}>{countryFlags[stat.country] || '🏳️'}</span>
                              <div>
                                <p style={{ margin: 0, fontWeight: 600, color: '#1f2937' }}>{stat.country}</p>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{stat.cities.length} πόλεις · 🤖{stat.androidCount} 🍎{stat.iosCount}</p>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#E53935' }}>{stat.count}</p>
                              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{percentage}%</p>
                            </div>
                          </div>
                          <div style={{ marginTop: 12, background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                            <div style={{ background: '#E53935', height: '100%', width: percentage + '%', borderRadius: 4 }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cities Detail */}
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                  🏙️ Πόλεις {expandedCountry && `- ${countryFlags[expandedCountry] || ''} ${expandedCountry}`}
                </h2>
                {!expandedCountry ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    <span style={{ fontSize: 48 }}>👈</span>
                    <p style={{ marginTop: 12 }}>Επίλεξε μια χώρα για να δεις τις πόλεις</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.find(s => s.country === expandedCountry)?.cities.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                        <p>Δεν υπάρχουν δεδομένα πόλεων</p>
                      </div>
                    ) : (
                      stats.find(s => s.country === expandedCountry)?.cities.map((city, i) => (
                        <div key={i} style={{ background: '#f9fafb', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>📍</span>
                            <span style={{ fontWeight: 500, color: '#1f2937' }}>{city.city}</span>
                          </div>
                          <span style={{ background: '#E53935', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 14, fontWeight: 600 }}>{city.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
