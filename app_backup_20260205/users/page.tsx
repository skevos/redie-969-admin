"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

interface DashboardUser {
  id: string;
  username: string;
  display_name: string;
  role: 'owner' | 'admin' | 'producer';
  producer_id?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<DashboardUser | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'producer' as 'owner' | 'admin' | 'producer',
    producer_id: '',
    is_active: true
  });
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Check if owner
    const savedUser = localStorage.getItem("dashboard_user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role !== 'owner') {
        window.location.href = '/';
        return;
      }
      setCurrentUser(user);
    } else {
      window.location.href = '/';
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    const { data: usersData } = await supabase
      .from('dashboard_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    const { data: producersData } = await supabase
      .from('producers')
      .select('id, name')
      .order('name');

    setUsers(usersData || []);
    setProducers(producersData || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (editUser) {
      // Update
      const updateData: any = {
        display_name: formData.display_name,
        role: formData.role,
        producer_id: formData.role === 'producer' ? formData.producer_id || null : null,
        is_active: formData.is_active
      };
      
      if (formData.password) {
        updateData.password_hash = formData.password;
      }

      await supabase
        .from('dashboard_users')
        .update(updateData)
        .eq('id', editUser.id);
    } else {
      // Create
      await supabase.from('dashboard_users').insert({
        username: formData.username.toLowerCase().trim(),
        password_hash: formData.password,
        display_name: formData.display_name,
        role: formData.role,
        producer_id: formData.role === 'producer' ? formData.producer_id || null : null,
        is_active: formData.is_active
      });
    }

    setShowModal(false);
    setEditUser(null);
    setFormData({ username: '', password: '', display_name: '', role: 'producer', producer_id: '', is_active: true });
    loadData();
  }

  function openEditModal(user: DashboardUser) {
    setEditUser(user);
    setFormData({
      username: user.username,
      password: '',
      display_name: user.display_name,
      role: user.role,
      producer_id: user.producer_id || '',
      is_active: user.is_active
    });
    setShowModal(true);
  }

  async function toggleActive(user: DashboardUser) {
    await supabase
      .from('dashboard_users')
      .update({ is_active: !user.is_active })
      .eq('id', user.id);
    loadData();
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 50, height: 50, border: '4px solid #e53935', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <header style={{ background: 'white', padding: '16px 32px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>← Dashboard</Link>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>🔐 Users & Roles</h1>
        </div>
        <button
          onClick={() => { setEditUser(null); setFormData({ username: '', password: '', display_name: '', role: 'producer', producer_id: '', is_active: true }); setShowModal(true); }}
          style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
        >
          + Νέος Χρήστης
        </button>
      </header>

      {/* Content */}
      <main style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Χρήστης</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Role</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Παραγωγός</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Last Login</th>
                <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>{user.display_name}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0 0' }}>@{user.username}</p>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: user.role === 'owner' ? '#fef3c7' : user.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                      color: user.role === 'owner' ? '#92400e' : user.role === 'admin' ? '#1e40af' : '#374151'
                    }}>
                      {user.role === 'owner' ? '👑 Owner' : user.role === 'admin' ? '🛡️ Admin' : '🎙️ Producer'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#6b7280', fontSize: 14 }}>
                    {producers.find(p => p.id === user.producer_id)?.name || '-'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: user.is_active ? '#dcfce7' : '#fee2e2',
                      color: user.is_active ? '#166534' : '#991b1b'
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#6b7280', fontSize: 13 }}>
                    {user.last_login ? new Date(user.last_login).toLocaleString('el-GR') : 'Never'}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => openEditModal(user)}
                      style={{ padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 8, fontSize: 13 }}
                    >
                      ✏️ Edit
                    </button>
                    {user.role !== 'owner' && (
                      <button
                        onClick={() => toggleActive(user)}
                        style={{ padding: '6px 12px', background: user.is_active ? '#fee2e2' : '#dcfce7', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                      >
                        {user.is_active ? '🚫' : '✅'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 32, width: '100%', maxWidth: 450 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 24px 0' }}>
              {editUser ? '✏️ Επεξεργασία Χρήστη' : '➕ Νέος Χρήστης'}
            </h2>
            <form onSubmit={handleSubmit}>
              {!editUser && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {editUser ? 'New Password (κενό = διατήρηση)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required={!editUser}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Display Name</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  disabled={editUser?.role === 'owner'}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                >
                  <option value="producer">🎙️ Producer</option>
                  <option value="admin">🛡️ Admin</option>
                  {!editUser && <option value="owner">👑 Owner</option>}
                </select>
              </div>
              {formData.role === 'producer' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Σύνδεση με Παραγωγό</label>
                  <select
                    value={formData.producer_id}
                    onChange={e => setFormData({ ...formData, producer_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  >
                    <option value="">-- Επιλέξτε --</option>
                    {producers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
                >
                  Άκυρο
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
                >
                  {editUser ? 'Αποθήκευση' : 'Δημιουργία'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
