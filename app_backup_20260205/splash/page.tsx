"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SplashPage() {
  const [config, setConfig] = useState({
    logo_url: '',
    background_color: '#050508',
    duration_ms: 2500,
    tagline: '',
    show_tagline: false,
  });
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const DEFAULT_CONFIG = {
    logo_url: '',
    background_color: '#050508',
    duration_ms: 2500,
    tagline: '',
    show_tagline: false,
  };

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    const { data } = await supabase.from('splash_config').select('*').eq('id', 1).single();
    if (data) {
      setConfig({
        logo_url: data.logo_url || '',
        background_color: data.background_color || '#050508',
        duration_ms: data.duration_ms || 2500,
        tagline: data.tagline || '',
        show_tagline: data.show_tagline || false,
      });
    }
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `splash_logo_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('splash')
      .upload(fileName, file);

    if (uploadError) {
      alert('Σφάλμα upload: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('splash').getPublicUrl(fileName);
    setConfig({ ...config, logo_url: data.publicUrl });
    setUploading(false);
  }

  async function saveField(field: string, value: any) {
    setSavingField(field);
    const { error } = await supabase
      .from('splash_config')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', 1);

    if (error) {
      alert('Σφάλμα: ' + error.message);
    } else {
      setSaved(field);
      setTimeout(() => setSaved(null), 2000);
    }
    setSavingField(null);
  }

  async function resetToDefault() {
    if (!confirm('Επαναφορά στις προεπιλεγμένες ρυθμίσεις;')) return;
    
    setSavingField('reset');
    const { error } = await supabase
      .from('splash_config')
      .update({
        ...DEFAULT_CONFIG,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      alert('Σφάλμα: ' + error.message);
    } else {
      setConfig(DEFAULT_CONFIG);
      setSaved('reset');
      setTimeout(() => setSaved(null), 2000);
    }
    setSavingField(null);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#e53935', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* SIDEBAR */}
      <Sidebar />
      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🚀</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Splash Screen</span>
          </div>
          {saved && (
            <div style={{ padding: '8px 16px', background: '#dcfce7', color: '#166534', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
              ✓ {saved === 'reset' ? 'Επαναφορά ολοκληρώθηκε!' : 'Αποθηκεύτηκε!'}
            </div>
          )}
        </header>

        <div style={{ padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            
            {/* Settings */}
            <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>⚙️ Ρυθμίσεις</h2>

              {/* Logo Upload */}
              <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 12 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {config.logo_url ? (
                    <img src={config.logo_url} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 12, background: config.background_color, padding: 8 }} />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: 12, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 32 }}>🖼️</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{
                      padding: '10px 20px',
                      background: '#fff',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#374151',
                      border: '1px solid #e5e7eb',
                    }}>
                      {uploading ? 'Ανέβασμα...' : '📷 Αλλαγή Logo'}
                      <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
                    </label>
                    <button
                      onClick={() => saveField('logo_url', config.logo_url || null)}
                      disabled={savingField === 'logo_url'}
                      style={{
                        padding: '8px 16px',
                        background: saved === 'logo_url' ? '#22c55e' : 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {savingField === 'logo_url' ? '...' : saved === 'logo_url' ? '✓' : '💾 Save'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Background Color */}
              <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 12 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Χρώμα Background</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={config.background_color}
                    onChange={e => setConfig({ ...config, background_color: e.target.value })}
                    style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={config.background_color}
                    onChange={e => setConfig({ ...config, background_color: e.target.value })}
                    style={{ flex: 1, padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontFamily: 'monospace' }}
                  />
                  <button
                    onClick={() => saveField('background_color', config.background_color)}
                    disabled={savingField === 'background_color'}
                    style={{
                      padding: '10px 16px',
                      background: saved === 'background_color' ? '#22c55e' : 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {savingField === 'background_color' ? '...' : saved === 'background_color' ? '✓' : '💾'}
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Διάρκεια: {(config.duration_ms / 1000).toFixed(1)}s</label>
                  <button
                    onClick={() => saveField('duration_ms', config.duration_ms)}
                    disabled={savingField === 'duration_ms'}
                    style={{
                      padding: '6px 12px',
                      background: saved === 'duration_ms' ? '#22c55e' : 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {savingField === 'duration_ms' ? '...' : saved === 'duration_ms' ? '✓' : '💾'}
                  </button>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="5000"
                  step="500"
                  value={config.duration_ms}
                  onChange={e => setConfig({ ...config, duration_ms: parseInt(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  <span>1s</span>
                  <span>5s</span>
                </div>
              </div>

              {/* Tagline */}
              <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Tagline</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.show_tagline}
                      onChange={e => setConfig({ ...config, show_tagline: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13, color: '#6b7280' }}>Εμφάνιση</span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="text"
                    value={config.tagline}
                    onChange={e => setConfig({ ...config, tagline: e.target.value })}
                    placeholder="π.χ. Your Music, Your Way"
                    style={{ flex: 1, padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 15, boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={async () => {
                      setSavingField('tagline');
                      await supabase.from('splash_config').update({ 
                        tagline: config.tagline || null, 
                        show_tagline: config.show_tagline,
                        updated_at: new Date().toISOString() 
                      }).eq('id', 1);
                      setSaved('tagline');
                      setTimeout(() => setSaved(null), 2000);
                      setSavingField(null);
                    }}
                    disabled={savingField === 'tagline'}
                    style={{
                      padding: '12px 16px',
                      background: saved === 'tagline' ? '#22c55e' : 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {savingField === 'tagline' ? '...' : saved === 'tagline' ? '✓' : '💾'}
                  </button>
                </div>
              </div>

              {/* Reset to Default Button */}
              <button
                onClick={resetToDefault}
                disabled={savingField === 'reset'}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: savingField === 'reset' ? '#9ca3af' : '#f3f4f6',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: savingField === 'reset' ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {savingField === 'reset' ? 'Επαναφορά...' : '🔄 Επαναφορά Προεπιλογών'}
              </button>
            </div>

            {/* Preview */}
            <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>📱 Preview</h2>
              
              <div style={{
                width: '100%',
                aspectRatio: '9/16',
                background: config.background_color,
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Glow effect */}
                <div style={{
                  position: 'absolute',
                  width: 200,
                  height: 200,
                  background: 'radial-gradient(circle, rgba(229, 57, 53, 0.3) 0%, transparent 70%)',
                  borderRadius: '50%',
                }}></div>
                
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo" style={{ width: '60%', maxWidth: 200, objectFit: 'contain', position: 'relative', zIndex: 1 }} />
                ) : (
                  <div style={{ color: '#e53935', fontSize: 48, fontWeight: 800, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    REDIE<br/>969
                  </div>
                )}
                
                {config.show_tagline && config.tagline && (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 20, position: 'relative', zIndex: 1 }}>
                    {config.tagline}
                  </p>
                )}
                
                <div style={{ position: 'absolute', bottom: 20, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  {(config.duration_ms / 1000).toFixed(1)}s
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
