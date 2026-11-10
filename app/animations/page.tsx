"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

import { adminDb, adminUpload } from '../lib/adminDb';
interface Animation {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  settings: any;
}

const ICONS: Record<string, string> = {
  hearts: '❤️', hearts_3d: '💖', snow: '❄️', rain: '🌧️', confetti: '🎊',
  sparkles: '⭐', fireflies: '✨', fireworks: '🎆', balloons: '🎈',
  bubbles: '🫧', petals: '🌸', leaves: '🍂', streamers: '🎀',
  party_poppers: '🎉', floating_3d: '🌟', matrix: '🟢', fire: '🔥',
  smoke: '🌫️', aurora: '🌌', neon_glow: '💡', lasers: '⚡',
  equalizer: '📊', sound_waves: '🔉', pulse_rings: '🔘',
  emojis: '😀', pixel_rain: '👾', glitch: '📺', text_animation: '✍️',
  // 1.0.9 (visible on phones from app 1.0.9)
  birthday: '🎂', dedication: '💌', lucky_wheel: '🎰', live_reactions: '❤️‍🔥', countdown: '🔢',
  glenti: '🍽️', kalymnos_sea: '🌊', vinyl: '💿', bass_drop: '⚡', disco_ball: '🪩'
};

// Types that open a settings form before they go live
const CONFIG_TYPES = ['birthday', 'dedication', 'lucky_wheel', 'countdown', 'bass_drop'];
// Types that get a fresh started_at on every start (phones that open late jump to the right moment)
const NEW_TYPES = ['birthday', 'dedication', 'lucky_wheel', 'live_reactions', 'countdown', 'glenti', 'kalymnos_sea', 'vinyl', 'bass_drop', 'disco_ball'];

const HINTS: Record<string, string> = {
  birthday: 'Τούρτα με κεράκια, μπαλόνια και το όνομα',
  dedication: 'Φάκελος που ανοίγει: Για / Από / μήνυμα',
  lucky_wheel: 'Ρόδα που σταματά στον νικητή',
  live_reactions: 'Οι ακροατές πατάνε emoji και φαίνονται σε όλους',
  countdown: '3-2-1 και έκρηξη με μήνυμα',
  glenti: 'Σπάσιμο πιάτων «ΟΠΑ!» και λουλούδια',
  kalymnos_sea: 'Κύματα, καΐκι, σφουγγάρια',
  vinyl: 'Δίσκος που γυρίζει και πετάει νότες',
  bass_drop: 'Λάμψη + τρέμουλο οθόνης σε κάθε μέτρο',
  disco_ball: 'Ντισκομπάλα με δέσμες φωτός',
};

const CATEGORIES = {
  '🎙️ Κοινό & Εκπομπή (νέα)': ['birthday', 'dedication', 'lucky_wheel', 'live_reactions', 'countdown'],
  '🇬🇷 Γλέντι & Κάλυμνος (νέα)': ['glenti', 'kalymnos_sea'],
  '🎧 DJ (νέα)': ['vinyl', 'bass_drop', 'disco_ball'],
  '💕 Romantic': ['hearts', 'hearts_3d', 'petals', 'bubbles'],
  '🌙 Ambient': ['snow', 'rain', 'sparkles', 'fireflies', 'leaves'],
  '🎉 Celebration': ['confetti', 'fireworks', 'balloons', 'streamers', 'party_poppers'],
  '🎨 Visual': ['neon_glow', 'matrix', 'fire', 'smoke', 'aurora', 'lasers', 'floating_3d'],
  '🔊 Music': ['equalizer', 'sound_waves', 'pulse_rings'],
  '🎮 Fun': ['emojis', 'pixel_rain', 'glitch'],
  '✍️ Text': ['text_animation']
};

export default function AnimationsPage() {
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Animation | null>(null);
  const [textMessage, setTextMessage] = useState('REDIE 969');
  const [textStyle, setTextStyle] = useState('neon');
  const [textPosition, setTextPosition] = useState('top');
  const [textSize, setTextSize] = useState(28);
  const [config, setConfig] = useState<Animation | null>(null);
  const [cfg, setCfg] = useState<any>({});

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('app_animations').select('*').order('name');
    setAnimations(data || []);
    setLoading(false);
  }

  async function toggle(id: string, active: boolean) {
    const anim = animations.find(a => a.id === id);
    const update: any = { is_active: !active };
    if (!active && anim && NEW_TYPES.includes(anim.type)) update.settings = { ...(anim.settings || {}), started_at: new Date().toISOString() };
    const { error } = await adminDb.from('app_animations').update(update).eq('id', id);
    if (error) alert('Σφάλμα: ' + error.message);
    load();
  }

  function openConfig(anim: Animation) {
    const st = anim.settings || {};
    setConfig(anim);
    setCfg({
      name: st.name || '',
      to: st.to || '', from: st.from || '', message: st.message ?? (anim.type === 'countdown' ? 'ΠΑΜΕ!' : ''),
      names: Array.isArray(st.names) ? st.names.join('\n') : '', winner: st.winner || '',
      count: st.from || 3,
      bpm: st.bpm || 128,
    });
  }

  async function saveConfigAndPlay() {
    if (!config) return;
    const t = config.type;
    let settings: any = { started_at: new Date().toISOString() };
    if (t === 'birthday') {
      if (!cfg.name.trim()) { alert('Γράψε το όνομα'); return; }
      settings.name = cfg.name.trim();
    } else if (t === 'dedication') {
      if (!cfg.to.trim()) { alert('Γράψε για ποιον είναι η αφιέρωση'); return; }
      settings = { ...settings, to: cfg.to.trim(), from: cfg.from.trim(), message: cfg.message.trim() };
    } else if (t === 'lucky_wheel') {
      const names = String(cfg.names).split(/\n|,/).map((x: string) => x.trim()).filter(Boolean);
      if (names.length < 2) { alert('Βάλε τουλάχιστον 2 ονόματα (ένα σε κάθε γραμμή)'); return; }
      const winner = cfg.winner && names.includes(cfg.winner) ? cfg.winner : names[Math.floor(Math.random() * names.length)];
      settings = { ...settings, names: names.slice(0, 24), winner };
      alert('🎰 Η ρόδα θα σταματήσει στο: ' + winner);
    } else if (t === 'countdown') {
      settings = { ...settings, from: Number(cfg.count) || 3, message: cfg.message.trim() || 'ΠΑΜΕ!' };
    } else if (t === 'bass_drop') {
      settings = { ...settings, bpm: Number(cfg.bpm) || 128 };
    }
    const { error } = await adminDb.from('app_animations').update({ is_active: true, settings }).eq('id', config.id);
    if (error) { alert('Σφάλμα: ' + error.message); return; }
    setConfig(null);
    load();
  }

  async function stopAll() {
    await adminDb.from('app_animations').update({ is_active: false }).eq('is_active', true);
    load();
  }

  async function saveTextAndActivate() {
    if (!selected) return;
    await adminDb.from('app_animations').update({
      is_active: true,
      settings: { message: textMessage, style: textStyle, position: textPosition, size: textSize }
    }).eq('id', selected.id);
    setSelected(null);
    load();
  }

  function openTextEditor(anim: Animation) {
    setSelected(anim);
    setTextMessage(anim.settings?.message || 'REDIE 969');
    setTextStyle(anim.settings?.style || 'neon');
    setTextPosition(anim.settings?.position || 'top');
    setTextSize(anim.settings?.size || 28);
  }

  const activeCount = animations.filter(a => a.is_active).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111', fontFamily: 'system-ui' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: 24 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ color: 'white', fontSize: 28, margin: 0 }}>✨ Animations</h1>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ background: activeCount > 0 ? '#22c55e' : '#333', color: 'white', padding: '10px 20px', borderRadius: 10, fontWeight: 600 }}>
              {activeCount} LIVE
            </div>
            {activeCount > 0 && (
              <button onClick={stopAll} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                ⏹ STOP ALL
              </button>
            )}
          </div>
        </div>

        {config && (() => {
          const input = { width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#333', color: 'white', fontSize: 16, marginBottom: 16, boxSizing: 'border-box' as const };
          const lbl = { color: '#aaa', fontSize: 14, display: 'block', marginBottom: 6 } as const;
          const t = config.type;
          const names = String(cfg.names || '').split(/\n|,/).map((x: string) => x.trim()).filter(Boolean);
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ background: '#222', borderRadius: 20, padding: 32, width: 420, maxWidth: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ color: 'white', margin: '0 0 8px', fontSize: 22 }}>{ICONS[t]} {config.name}</h2>
                <p style={{ color: '#888', fontSize: 13, margin: '0 0 20px' }}>{HINTS[t]}</p>
                {t === 'birthday' && (<>
                  <label style={lbl}>Όνομα εορτάζοντα</label>
                  <input value={cfg.name} onChange={e => setCfg({ ...cfg, name: e.target.value })} placeholder="π.χ. Μαρία" style={input} />
                </>)}
                {t === 'dedication' && (<>
                  <label style={lbl}>Για</label>
                  <input value={cfg.to} onChange={e => setCfg({ ...cfg, to: e.target.value })} placeholder="π.χ. τη Μαρία" style={input} />
                  <label style={lbl}>Από</label>
                  <input value={cfg.from} onChange={e => setCfg({ ...cfg, from: e.target.value })} placeholder="π.χ. τον Γιώργο" style={input} />
                  <label style={lbl}>Μήνυμα ή τραγούδι (προαιρετικό)</label>
                  <input value={cfg.message} onChange={e => setCfg({ ...cfg, message: e.target.value })} placeholder="π.χ. Σ' αγαπώ — Νότης Σφακιανάκης" style={input} />
                </>)}
                {t === 'lucky_wheel' && (<>
                  <label style={lbl}>Συμμετέχοντες (ένα όνομα σε κάθε γραμμή, μέχρι 24)</label>
                  <textarea value={cfg.names} onChange={e => setCfg({ ...cfg, names: e.target.value })} rows={6} placeholder={'Νίκος\nΜαρία\nΚώστας'} style={{ ...input, fontFamily: 'inherit', resize: 'vertical' }} />
                  <label style={lbl}>Νικητής</label>
                  <select value={cfg.winner} onChange={e => setCfg({ ...cfg, winner: e.target.value })} style={input}>
                    <option value="">🎲 Τυχαία κλήρωση</option>
                    {names.map((n: string) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <p style={{ color: '#888', fontSize: 12, margin: '-8px 0 16px' }}>Η ρόδα γυρίζει ~7 δευτερόλεπτα σε όλα τα κινητά και σταματά στον ίδιο νικητή.</p>
                </>)}
                {t === 'countdown' && (<>
                  <label style={lbl}>Από πόσο μετράει</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {[3, 5, 10].map(n => (
                      <button key={n} onClick={() => setCfg({ ...cfg, count: n })} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: Number(cfg.count) === n ? '#E53935' : '#333', color: 'white', fontWeight: 700, cursor: 'pointer' }}>{n}</button>
                    ))}
                  </div>
                  <label style={lbl}>Μήνυμα στο τέλος</label>
                  <input value={cfg.message} onChange={e => setCfg({ ...cfg, message: e.target.value })} placeholder="π.χ. ΠΡΕΜΙΕΡΑ!" style={input} />
                </>)}
                {t === 'bass_drop' && (<>
                  <label style={lbl}>BPM: {cfg.bpm} (χτύπημα σε κάθε μέτρο)</label>
                  <input type="range" min={80} max={180} value={cfg.bpm} onChange={e => setCfg({ ...cfg, bpm: Number(e.target.value) })} style={{ width: '100%', marginBottom: 24 }} />
                </>)}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setConfig(null)} style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: '#333', color: 'white', fontSize: 16, cursor: 'pointer' }}>✕ Άκυρο</button>
                  <button onClick={saveConfigAndPlay} style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: '#22c55e', color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>▶ Παίξε</button>
                </div>
              </div>
            </div>
          );
        })()}

        {selected && selected.type === 'text_animation' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#222', borderRadius: 20, padding: 32, width: 400 }}>
              <h2 style={{ color: 'white', margin: '0 0 24px', fontSize: 22 }}>✍️ Text Settings</h2>
              
              <label style={{ color: '#aaa', fontSize: 14 }}>Message</label>
              <input 
                value={textMessage} 
                onChange={e => setTextMessage(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#333', color: 'white', fontSize: 16, marginBottom: 16, boxSizing: 'border-box' }}
              />
              
              <label style={{ color: '#aaa', fontSize: 14 }}>Style</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  {id: 'neon', icon: '💡', label: 'Neon'},
                  {id: 'typewriter', icon: '⌨️', label: 'Type'},
                  {id: 'wave', icon: '🌊', label: 'Wave'},
                  {id: 'sparkle', icon: '✨', label: 'Sparkle'},
                  {id: 'handwriting', icon: '✍️', label: 'Hand'}
                ].map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setTextStyle(s.id)}
                    style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: textStyle === s.id ? '#E53935' : '#333', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
              
              <label style={{ color: '#aaa', fontSize: 14 }}>Position</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  {id: 'top', icon: '⬆️', label: 'Top'},
                  {id: 'center', icon: '⏺️', label: 'Center'},
                  {id: 'bottom', icon: '⬇️', label: 'Bottom'}
                ].map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => setTextPosition(p.id)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: textPosition === p.id ? '#E53935' : '#333', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
              
              <label style={{ color: '#aaa', fontSize: 14 }}>Size: {textSize}px</label>
              <input 
                type="range" 
                min="16" 
                max="48" 
                value={textSize} 
                onChange={e => setTextSize(Number(e.target.value))}
                style={{ width: '100%', marginBottom: 24 }}
              />
              
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setSelected(null)} style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: '#333', color: 'white', fontSize: 16, cursor: 'pointer' }}>
                  ✕ Cancel
                </button>
                <button onClick={saveTextAndActivate} style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: '#22c55e', color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
                  ✓ Save & Play
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ color: 'white', textAlign: 'center', padding: 60 }}>Loading...</div>
        ) : (
          Object.entries(CATEGORIES).map(([category, types]) => {
            const catAnims = animations.filter(a => types.includes(a.type));
            if (catAnims.length === 0) return null;
            
            return (
              <div key={category} style={{ marginBottom: 32 }}>
                <h2 style={{ color: '#888', fontSize: 16, marginBottom: 16 }}>{category}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                  {catAnims.map(anim => (
                    <div 
                      key={anim.id}
                      style={{
                        background: anim.is_active ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#222',
                        borderRadius: 16,
                        padding: 16,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: anim.is_active ? '2px solid #22c55e' : '2px solid transparent',
                      }}
                    >
                      <div 
                        onClick={() => {
                          if (anim.type === 'text_animation' && !anim.is_active) {
                            openTextEditor(anim);
                          } else if (CONFIG_TYPES.includes(anim.type) && !anim.is_active) {
                            openConfig(anim);
                          } else {
                            toggle(anim.id, anim.is_active);
                          }
                        }}
                      >
                        <div style={{ fontSize: 36, marginBottom: 8 }}>{ICONS[anim.type] || '🎨'}</div>
                        <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{anim.name}</div>
                        {HINTS[anim.type] && !anim.is_active && <div style={{ color: '#888', fontSize: 10, marginTop: 4, lineHeight: 1.3 }}>{HINTS[anim.type]}</div>}
                        {anim.is_active && anim.type === 'lucky_wheel' && anim.settings?.winner && <div style={{ color: 'white', fontSize: 11, marginTop: 4 }}>🏆 {anim.settings.winner}</div>}
                        {anim.is_active && <div style={{ color: 'white', fontSize: 11, marginTop: 4 }}>● LIVE (tap to stop)</div>}
                      </div>
                      {CONFIG_TYPES.includes(anim.type) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openConfig(anim); }}
                          style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#444', color: 'white', fontSize: 11, cursor: 'pointer' }}
                        >
                          {anim.is_active ? '🔁 Ξανά / Αλλαγή' : '✏️ Ρύθμιση'}
                        </button>
                      )}
                      {anim.type === 'text_animation' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); openTextEditor(anim); }}
                          style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#444', color: 'white', fontSize: 11, cursor: 'pointer' }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
