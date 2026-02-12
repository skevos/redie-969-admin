"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

export default function PollsPage() {
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPoll, setEditingPoll] = useState<any>(null);
  const [form, setForm] = useState({
    question: '',
    option_1: '',
    option_2: '',
    option_3: '',
    option_4: '',
    sponsor_name: '',
    sponsor_url: '',
    sponsor_url_active: false,
    is_active: false,
    vote_multiplier: 0
  });
  const [pollVotes, setPollVotes] = useState<{[key: number]: number}>({});
  const [countdowns, setCountdowns] = useState<{[key: number]: string}>({});
  const [countdownInput, setCountdownInput] = useState<{[key: number]: number}>({});

  useEffect(() => { loadPolls(); }, []);

  useEffect(() => {
    if (polls.length === 0) return;
    
    const updateCountdowns = () => {
      const newCountdowns: {[key: number]: string} = {};
      polls.forEach(poll => {
        if (poll.countdown_end) {
          const end = new Date(poll.countdown_end).getTime();
          const now = new Date().getTime();
          const diff = end - now;
          console.log('Poll', poll.id, 'end:', poll.countdown_end, 'diff:', diff);
          if (diff > 0) {
            const hours = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            if (hours > 0) {
              newCountdowns[poll.id] = `${hours}ω ${mins.toString().padStart(2, '0')}λ`;
            } else {
              newCountdowns[poll.id] = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
          } else {
            newCountdowns[poll.id] = 'ΛΗΞΕ';
          }
        }
      });
      setCountdowns(newCountdowns);
    };
    
    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [polls]);

  async function loadPolls() {
    const { data } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
    setPolls(data || []);
    setLoading(false);
    if (data) {
      const votes: {[key: number]: number} = {};
      for (const poll of data) {
        const { count } = await supabase.from('poll_votes').select('*', { count: 'exact', head: true }).eq('poll_id', poll.id);
        votes[poll.id] = count || 0;
      }
      setPollVotes(votes);
    }
  }

  async function savePoll() {
    if (editingPoll) {
      await supabase.from('polls').update(form).eq('id', editingPoll.id);
    } else {
      await supabase.from('polls').insert(form);
    }
    setShowModal(false);
    setEditingPoll(null);
    setForm({ question: '', option_1: '', option_2: '', option_3: '', option_4: '', sponsor_name: '', sponsor_url: '', sponsor_url_active: false, is_active: false, vote_multiplier: 0 });
    loadPolls();
  }

  async function deletePoll(id: number) {
    if (confirm('Διαγραφή poll;')) {
      await supabase.from('polls').delete().eq('id', id);
      loadPolls();
    }
  }

  async function toggleActive(poll: any) {
    if (!poll.is_active) {
      await supabase.from('polls').update({ is_active: false }).neq('id', poll.id);
      const minutes = countdownInput[poll.id] || 0;
      const countdown_end = minutes > 0 ? new Date(Date.now() + minutes * 60000).toISOString() : null;
      await supabase.from('polls').update({ is_active: true, countdown_end }).eq('id', poll.id);
    } else {
      await supabase.from('polls').update({ is_active: false, countdown_end: null }).eq('id', poll.id);
    }
    loadPolls();
  }

  async function clearCountdown(pollId: number) {
    await supabase.from('polls').update({ countdown_end: null }).eq('id', pollId);
    setCountdownInput({...countdownInput, [pollId]: 0});
    loadPolls();
  }

  function openEdit(poll: any) {
    setEditingPoll(poll);
    setForm({
      question: poll.question || '',
      option_1: poll.option_1 || '',
      option_2: poll.option_2 || '',
      option_3: poll.option_3 || '',
      option_4: poll.option_4 || '',
      sponsor_name: poll.sponsor_name || '',
      sponsor_url: poll.sponsor_url || '',
      sponsor_url_active: poll.sponsor_url_active || false,
      is_active: poll.is_active || false,
      vote_multiplier: poll.vote_multiplier || 0
    });
    setShowModal(true);
  }

  function openNew() {
    setEditingPoll(null);
    setForm({ question: '', option_1: '', option_2: '', option_3: '', option_4: '', sponsor_name: '', sponsor_url: '', sponsor_url_active: false, is_active: false, vote_multiplier: 0 });
    setShowModal(true);
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} style={{ width: 48, height: 26, borderRadius: 13, background: checked ? '#22c55e' : '#9ca3af', border: 'none', cursor: 'pointer', position: 'relative' }}>
      <div style={{ width: 20, height: 20, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: checked ? 25 : 3, transition: 'all 0.2s' }} />
    </button>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📊</span>
            <div>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Polls</span>
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Δημιουργία ψηφοφοριών για την αρχική οθόνη</p>
            </div>
          </div>
          <button onClick={openNew} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>+</span> Νέο Poll
          </button>
        </header>

        <div style={{ padding: 28 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>Φόρτωση...</div>
          ) : polls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Δεν υπάρχουν polls. Δημιούργησε ένα!</div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {polls.map(poll => (
                <div key={poll.id} style={{ background: 'white', borderRadius: 16, padding: 20, border: poll.is_active ? '2px solid #22c55e' : '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 20 }}>📊</span>
                        <p style={{ fontWeight: 700, color: '#1f2937', margin: 0, fontSize: 16 }}>{poll.question}</p>
                        {poll.is_active && <span style={{ background: '#22c55e', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>ACTIVE</span>}
                        {countdowns[poll.id] && countdowns[poll.id] !== 'ΛΗΞΕ' && (
                          <span style={{ background: '#e53935', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                            ⏱️ {countdowns[poll.id]}
                          </span>
                        )}
                        {countdowns[poll.id] === 'ΛΗΞΕ' && (
                          <span style={{ background: '#dc2626', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                            ⏱️ ΛΗΞΕ
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        {[poll.option_1, poll.option_2, poll.option_3, poll.option_4].filter(Boolean).map((opt, i) => (
                          <span key={i} style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: 8, fontSize: 12, color: '#374151' }}>{opt}</span>
                        ))}
                      </div>
                      {poll.sponsor_name && (
                        <p style={{ fontSize: 12, color: '#f59e0b', margin: 0 }}>💰 Sponsored by: {poll.sponsor_name}</p>
                      )}
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>
                        🗳️ Αληθινές: <strong>{pollVotes[poll.id] || 0}</strong> | Εμφανίζονται: <strong>{(pollVotes[poll.id] || 0) + (poll.vote_multiplier || 0)}</strong>
                      </p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>⏱️ Countdown:</span>
                        <input 
                          type="number" 
                          value={countdownInput[poll.id] || ''} 
                          onChange={(e) => setCountdownInput({...countdownInput, [poll.id]: parseInt(e.target.value) || 0})}
                          placeholder="λεπτά"
                          style={{ width: 80, padding: '6px 10px', border: '2px solid #e53935', borderRadius: 8, fontSize: 13 }}
                        />
                        <span style={{ fontSize: 11, color: '#6b7280' }}>λεπτά</span>
                        {!poll.is_active && countdownInput[poll.id] > 0 && (
                          <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✓ Θα ξεκινήσει με την ενεργοποίηση</span>
                        )}
                        {poll.is_active && poll.countdown_end && (
                          <button onClick={() => clearCountdown(poll.id)} style={{ padding: '6px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>✕ Σταμάτα</button>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button onClick={() => toggleActive(poll)} style={{ padding: '8px 16px', background: poll.is_active ? '#fef2f2' : '#22c55e', color: poll.is_active ? '#dc2626' : 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                        {poll.is_active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                      </button>
                      <button onClick={() => openEdit(poll)} style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                      <button onClick={() => deletePoll(poll.id)} style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, width: 520, maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#1f2937' }}>{editingPoll ? 'Επεξεργασία Poll' : 'Νέο Poll'}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Ερώτηση</label>
                <input type="text" value={form.question} onChange={e => setForm({...form, question: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, boxSizing: 'border-box' }} placeholder="π.χ. Ποιο είδος μουσικής προτιμάς;" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Επιλογή 1 *</label>
                  <input type="text" value={form.option_1} onChange={e => setForm({...form, option_1: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, boxSizing: 'border-box' }} placeholder="Rock" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Επιλογή 2 *</label>
                  <input type="text" value={form.option_2} onChange={e => setForm({...form, option_2: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, boxSizing: 'border-box' }} placeholder="Pop" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Επιλογή 3</label>
                  <input type="text" value={form.option_3} onChange={e => setForm({...form, option_3: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, boxSizing: 'border-box' }} placeholder="Hip-Hop (προαιρετικό)" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Επιλογή 4</label>
                  <input type="text" value={form.option_4} onChange={e => setForm({...form, option_4: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, boxSizing: 'border-box' }} placeholder="Electronic (προαιρετικό)" />
                </div>
              </div>

              <div style={{ borderTop: '2px solid #6b7280', paddingTop: 16, marginTop: 8 }}>
                <p style={{ fontWeight: 600, color: '#1f2937', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><span>🗳️</span> Ψήφοι Multiplier</p>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Προσθέτει fake ψήφους στην εμφάνιση (0 αληθινές + 10 multiplier = 10 εμφανίζονται)</p>
                <input type="number" value={form.vote_multiplier} onChange={e => setForm({...form, vote_multiplier: parseInt(e.target.value) || 0})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, boxSizing: 'border-box' }} placeholder="0" min="0" />
              </div>

              <div style={{ borderTop: '2px solid #f59e0b', paddingTop: 16, marginTop: 8 }}>
                <p style={{ fontWeight: 600, color: '#1f2937', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><span>💰</span> Χορηγός Poll</p>
                <input type="text" value={form.sponsor_name} onChange={e => setForm({...form, sponsor_name: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #f59e0b', borderRadius: 12, fontSize: 14, background: '#fffbeb', marginBottom: 12, boxSizing: 'border-box' }} placeholder="Όνομα χορηγού (προαιρετικό)" />
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: form.sponsor_url_active ? 'rgba(59,130,246,0.1)' : '#f9fafb', borderRadius: 10, marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1f2937', margin: 0, fontSize: 13 }}>🔗 Link χορηγού</p>
                    <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>{form.sponsor_url_active ? '✅ Clickable' : 'Απενεργοποιημένο'}</p>
                  </div>
                  <Toggle checked={form.sponsor_url_active} onChange={() => setForm({...form, sponsor_url_active: !form.sponsor_url_active})} />
                </div>
                {form.sponsor_url_active && (
                  <input type="text" value={form.sponsor_url} onChange={e => setForm({...form, sponsor_url: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #3b82f6', borderRadius: 12, fontSize: 14, background: '#eff6ff', boxSizing: 'border-box' }} placeholder="https://example.com" />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ακύρωση</button>
              <button onClick={savePoll} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Αποθήκευση</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
