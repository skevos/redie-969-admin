"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Producer {
  id: number;
  name: string;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
}

interface FavoriteCount {
  producer_name: string;
  favorites_count: number;
}

export default function ProducersPage() {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', photo_url: '' });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadProducers();
    loadFavoriteCounts();
  }, []);

  async function loadProducers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('producers')
      .select('*')
      .order('name');
    if (data) setProducers(data);
    setLoading(false);
  }

  async function loadFavoriteCounts() {
    const { data, error } = await supabase
      .from('producer_favorites_count')
      .select('*');
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((item: FavoriteCount) => {
        counts[item.producer_name] = item.favorites_count;
      });
      setFavoriteCounts(counts);
    }
  }

  function openNew() {
    setIsNew(true);
    setEditing(null);
    setForm({ name: '', bio: '', photo_url: '' });
  }

  function openEdit(producer: Producer) {
    setIsNew(false);
    setEditing(producer);
    setForm({ 
      name: producer.name || '', 
      bio: producer.bio || '', 
      photo_url: producer.photo_url || '' 
    });
  }

  function closeModal() {
    setEditing(null);
    setIsNew(false);
    setForm({ name: '', bio: '', photo_url: '' });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `producer_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('producers')
      .upload(fileName, file);

    if (uploadError) {
      alert('Σφάλμα upload: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('producers').getPublicUrl(fileName);
    setForm({ ...form, photo_url: data.publicUrl });
    setUploading(false);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      alert('Το όνομα είναι υποχρεωτικό!');
      return;
    }

    setSaving(true);

    if (isNew) {
      const { error } = await supabase.from('producers').insert({
        name: form.name,
        bio: form.bio || null,
        photo_url: form.photo_url || null,
      });
      if (error) alert('Σφάλμα: ' + error.message);
    } else if (editing) {
      const { error } = await supabase.from('producers')
        .update({
          name: form.name,
          bio: form.bio || null,
          photo_url: form.photo_url || null,
        })
        .eq('id', editing.id);
      if (error) alert('Σφάλμα: ' + error.message);
    }

    setSaving(false);
    closeModal();
    loadProducers();
  }

  async function handleDelete(id: number) {
    if (!confirm('Διαγραφή παραγωγού;')) return;
    await supabase.from('producers').delete().eq('id', id);
    loadProducers();
  }

  // Calculate total favorites
  const totalFavorites = Object.values(favoriteCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: 240, background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 20, boxShadow: '4px 0 20px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(229, 57, 53, 0.4)' }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>R</span>
            </div>
            <div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>REDIE</span>
              <span style={{ color: '#e53935', fontWeight: 700, fontSize: 18, marginLeft: 4 }}>969</span>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🏠</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Dashboard</span>
          </Link>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Schedule</span>
          </Link>
          <Link href="/producers" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(229, 57, 53, 0.15)', color: '#e53935', borderRadius: 12, textDecoration: 'none', marginBottom: 6, border: '1px solid rgba(229, 57, 53, 0.2)' }}>
            <span style={{ fontSize: 18 }}>🎤</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Παραγωγοί</span>
          </Link>
          <Link href="/studio" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Live Chat</span>
          </Link>
          <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Notifications</span>
          </Link>
          <Link href="/content" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>📱</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>App Content</span>
          </Link>
        </nav>

        <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>REDIE 969 Admin v1.0</p>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: 240 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🎤</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Παραγωγοί</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Total Favorites Badge */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '8px 16px', 
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
              borderRadius: 12,
              border: '1px solid #fecaca'
            }}>
              <span style={{ fontSize: 20 }}>❤️</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{totalFavorites}</div>
                <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 500 }}>ΣΥΝΟΛΙΚΑ</div>
              </div>
            </div>
            <button
              onClick={openNew}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>➕</span> Νέος Παραγωγός
            </button>
          </div>
        </header>

        <div style={{ padding: 28 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ width: 48, height: 48, border: '3px solid #e5e7eb', borderTopColor: '#e53935', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            </div>
          ) : producers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <span style={{ fontSize: 60 }}>🎤</span>
              <p style={{ marginTop: 16, color: '#6b7280', fontSize: 18 }}>Δεν υπάρχουν παραγωγοί</p>
              <p style={{ color: '#9ca3af' }}>Πάτα "Νέος Παραγωγός" για να προσθέσεις</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {producers.map(producer => {
                const likes = favoriteCounts[producer.name] || 0;
                return (
                <div
                  key={producer.id}
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    border: '1px solid #f3f4f6',
                    position: 'relative',
                  }}
                >
                  {/* Favorites Badge */}
                  {likes > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: '1px solid #fecaca',
                    }}>
                      <span style={{ color: '#dc2626', fontSize: 14 }}>❤️</span>
                      <span style={{ color: '#dc2626', fontSize: 14, fontWeight: 700 }}>{likes}</span>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {producer.photo_url ? (
                      <img
                        src={producer.photo_url}
                        alt={producer.name}
                        style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 28 }}>🎤</span>
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>{producer.name}</h3>
                      {producer.bio && (
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280', lineHeight: 1.4 }}>
                          {producer.bio.length > 60 ? producer.bio.substring(0, 60) + '...' : producer.bio}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                    <button
                      onClick={() => openEdit(producer)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Επεξεργασία
                    </button>
                    <button
                      onClick={() => handleDelete(producer.id)}
                      style={{
                        padding: '8px 12px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      {(editing || isNew) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 28,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: '#1f2937' }}>
              {isNew ? '➕ Νέος Παραγωγός' : '✏️ Επεξεργασία Παραγωγού'}
            </h2>

            {/* Photo */}
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              {form.photo_url ? (
                <img src={form.photo_url} alt="Preview" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px' }} />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <span style={{ fontSize: 40 }}>🎤</span>
                </div>
              )}
              <label style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: '#f3f4f6',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                color: '#374151',
              }}>
                {uploading ? 'Ανέβασμα...' : '📷 Αλλαγή Φωτογραφίας'}
                <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Όνομα *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="π.χ. Γιώργος Παπαδόπουλος"
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Bio */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Σύντομη περιγραφή..."
                rows={3}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 15, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={closeModal}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Άκυρο
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: saving ? '#9ca3af' : 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Αποθήκευση...' : '💾 Αποθήκευση'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
