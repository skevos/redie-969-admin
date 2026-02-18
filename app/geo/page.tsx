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
  const [totalInstalls, setTotalInstalls] = useState(0);
  const [totalIos, setTotalIos] = useState(0);
  const [totalAndroid, setTotalAndroid] = useState(0);
  const [geoDevices, setGeoDevices] = useState(0);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const { data: devices } = await supabase.from('app_analytics').select('platform');
      if (devices) {
        setTotalInstalls(devices.length);
        setTotalAndroid(devices.filter(d => d.platform === 'android').length);
        setTotalIos(devices.filter(d => d.platform === 'ios').length);
      }
      const { data: tokens } = await supabase.from('fcm_tokens').select('country, city, region, platform');
      if (tokens) {
        const countryMap = new Map<string, { count: number; iosCount: number; androidCount: number; cities: Map<string, number> }>();
        let geoCount = 0;
        tokens.forEach(t => {
          if (t.country) {
            geoCount++;
            if (!countryMap.has(t.country)) countryMap.set(t.country, { count: 0, iosCount: 0, androidCount: 0, cities: new Map() });
            const cd = countryMap.get(t.country)!;
            cd.count++;
            if (t.platform === 'ios') cd.iosCount++; else cd.androidCount++;
            if (t.city) cd.cities.set(t.city, (cd.cities.get(t.city) || 0) + 1);
          }
        });
        setGeoDevices(geoCount);
        setStats(Array.from(countryMap.entries()).map(([country, data]) => ({
          country, count: data.count, iosCount: data.iosCount, androidCount: data.androidCount,
          cities: Array.from(data.cities.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count)
        })).sort((a, b) => b.count - a.count));
      }
      setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  }

  const countryFlags: Record<string, string> = {
    'Greece': '\u{1F1EC}\u{1F1F7}', 'United States': '\u{1F1FA}\u{1F1F8}', 'Australia': '\u{1F1E6}\u{1F1FA}', 'Germany': '\u{1F1E9}\u{1F1EA}',
    'United Kingdom': '\u{1F1EC}\u{1F1E7}', 'France': '\u{1F1EB}\u{1F1F7}', 'Italy': '\u{1F1EE}\u{1F1F9}', 'Spain': '\u{1F1EA}\u{1F1F8}',
    'Netherlands': '\u{1F1F3}\u{1F1F1}', 'Belgium': '\u{1F1E7}\u{1F1EA}', 'Switzerland': '\u{1F1E8}\u{1F1ED}', 'Austria': '\u{1F1E6}\u{1F1F9}',
    'Sweden': '\u{1F1F8}\u{1F1EA}', 'Norway': '\u{1F1F3}\u{1F1F4}', 'Denmark': '\u{1F1E9}\u{1F1F0}', 'Finland': '\u{1F1EB}\u{1F1EE}',
    'Poland': '\u{1F1F5}\u{1F1F1}', 'Czech Republic': '\u{1F1E8}\u{1F1FF}', 'Portugal': '\u{1F1F5}\u{1F1F9}', 'Ireland': '\u{1F1EE}\u{1F1EA}',
    'Cyprus': '\u{1F1E8}\u{1F1FE}', 'Canada': '\u{1F1E8}\u{1F1E6}', 'Brasil': '\u{1F1E7}\u{1F1F7}', 'Brazil': '\u{1F1E7}\u{1F1F7}',
    'Turkey': '\u{1F1F9}\u{1F1F7}', 'Bulgaria': '\u{1F1E7}\u{1F1EC}', 'Romania': '\u{1F1F7}\u{1F1F4}', 'Albania': '\u{1F1E6}\u{1F1F1}',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#1f2937' }}>{'\u{1F30D}'} Geo Analytics</h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>{'\u03A3\u03C5\u03C3\u03BA\u03B5\u03C5\u03AD\u03C2 \u03B1\u03BD\u03AC \u03C7\u03CE\u03C1\u03B1 \u03BA\u03B1\u03B9 \u03C0\u03B5\u03C1\u03B9\u03BF\u03C7\u03AE'}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ background: '#f0fdf4', padding: '8px 16px', borderRadius: 10, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#166534' }}>{totalAndroid}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{'\u{1F916}'} Android</p>
            </div>
            <div style={{ background: '#eff6ff', padding: '8px 16px', borderRadius: 10, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e40af' }}>{totalIos}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{'\u{1F34E}'} iOS</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #E53935 0%, #c62828 100%)', color: 'white', padding: '8px 20px', borderRadius: 10, fontWeight: 700, fontSize: 18 }}>
              {'\u{1F4F1}'} {totalInstalls}
            </div>
          </div>
        </header>

        <div style={{ padding: 32 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 50, height: 50, border: '4px solid #e53935', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div></div>
          ) : (
            <>
              <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{'\u{1F4CD}'}</span>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                  <strong style={{ color: '#1f2937' }}>{geoDevices}</strong> {'\u03B1\u03C0\u03CC'} <strong style={{ color: '#1f2937' }}>{totalInstalls}</strong> {'\u03C3\u03C5\u03C3\u03BA\u03B5\u03C5\u03AD\u03C2'} ({totalInstalls > 0 ? Math.round(geoDevices / totalInstalls * 100) : 0}%) {'\u03AD\u03B4\u03C9\u03C3\u03B1\u03BD \u03C4\u03BF\u03C0\u03BF\u03B8\u03B5\u03C3\u03AF\u03B1'}
                </p>
              </div>

              {stats.length === 0 ? (
                <div style={{ background: 'white', borderRadius: 16, padding: 60, textAlign: 'center' }}>
                  <span style={{ fontSize: 64 }}>{'\u{1F30D}'}</span>
                  <p style={{ color: '#6b7280', marginTop: 16 }}>{'\u0394\u03B5\u03BD \u03C5\u03C0\u03AC\u03C1\u03C7\u03BF\u03C5\u03BD \u03B4\u03B5\u03B4\u03BF\u03BC\u03AD\u03BD\u03B1 \u03C4\u03BF\u03C0\u03BF\u03B8\u03B5\u03C3\u03AF\u03B1\u03C2'}</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                    <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>{'\u{1F4CA}'} {'\u03A7\u03CE\u03C1\u03B5\u03C2'}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {stats.map((stat, i) => {
                        const percentage = Math.round((stat.count / geoDevices) * 100);
                        const isExpanded = expandedCountry === stat.country;
                        return (
                          <div key={i}>
                            <div onClick={() => setExpandedCountry(isExpanded ? null : stat.country)}
                              style={{ background: isExpanded ? 'rgba(229,57,53,0.1)' : '#f9fafb', borderRadius: 12, padding: 16, cursor: 'pointer', border: isExpanded ? '2px solid #E53935' : '2px solid transparent' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <span style={{ fontSize: 24 }}>{countryFlags[stat.country] || '\u{1F3F3}\u{FE0F}'}</span>
                                  <div>
                                    <p style={{ margin: 0, fontWeight: 600, color: '#1f2937' }}>{stat.country}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{stat.cities.length} {'\u03C0\u03CC\u03BB\u03B5\u03B9\u03C2'} {'\u00B7'} {'\u{1F916}'}{stat.androidCount} {'\u{1F34E}'}{stat.iosCount}</p>
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
                  <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                    <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                      {'\u{1F3D9}\u{FE0F}'} {'\u03A0\u03CC\u03BB\u03B5\u03B9\u03C2'} {expandedCountry && `- ${countryFlags[expandedCountry] || ''} ${expandedCountry}`}
                    </h2>
                    {!expandedCountry ? (
                      <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                        <span style={{ fontSize: 48 }}>{'\u{1F448}'}</span>
                        <p style={{ marginTop: 12 }}>{'\u0395\u03C0\u03AF\u03BB\u03B5\u03BE\u03B5 \u03BC\u03B9\u03B1 \u03C7\u03CE\u03C1\u03B1 \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03B4\u03B5\u03B9\u03C2 \u03C4\u03B9\u03C2 \u03C0\u03CC\u03BB\u03B5\u03B9\u03C2'}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {stats.find(s => s.country === expandedCountry)?.cities.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                            <p>{'\u0394\u03B5\u03BD \u03C5\u03C0\u03AC\u03C1\u03C7\u03BF\u03C5\u03BD \u03B4\u03B5\u03B4\u03BF\u03BC\u03AD\u03BD\u03B1 \u03C0\u03CC\u03BB\u03B5\u03C9\u03BD'}</p>
                          </div>
                        ) : (
                          stats.find(s => s.country === expandedCountry)?.cities.map((city, i) => (
                            <div key={i} style={{ background: '#f9fafb', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 18 }}>{'\u{1F4CD}'}</span>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
