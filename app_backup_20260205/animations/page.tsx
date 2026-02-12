"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

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
  emojis: '😀', pixel_rain: '👾', glitch: '📺', text_animation: '✍️'
};

const CATEGORIES = {
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

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('app_animations').select('*').order('name');
    setAnimations(data || []);
    setLoading(false);
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from('app_animations').update({ is_active: !active }).eq('id', id);
    load();
  }

  async function stopAll() {
    await supabase.from('app_animations').update({ is_active: false }).neq('id', '');
    load();
  }

  async function saveTextAndActivate() {
    if (!selected) return;
    await supabase.from('app_animations').update({
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
                          } else {
                            toggle(anim.id, anim.is_active);
                          }
                        }}
                      >
                        <div style={{ fontSize: 36, marginBottom: 8 }}>{ICONS[anim.type] || '🎨'}</div>
                        <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{anim.name}</div>
                        {anim.is_active && <div style={{ color: 'white', fontSize: 11, marginTop: 4 }}>● LIVE (tap to stop)</div>}
                      </div>
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
