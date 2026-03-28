"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

export default function PollsPage() {
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPoll, setEditingPoll] = useState<any>(null);
  const [pollVotes, setPollVotes] = useState<{ [key: number]: number }>({});
  const [countdowns, setCountdowns] = useState<{ [key: number]: string }>({});
  const [countdownInput, setCountdownInput] = useState<{ [key: number]: number }>({});
  const [saving, setSaving] = useState(false);
  const [showVotes, setShowVotes] = useState<{ [key: number]: boolean }>({});

  const [form, setForm] = useState({
    question: "",
    option_1: "",
    option_2: "",
    option_3: "",
    option_4: "",
    sponsor_name: "",
    sponsor_url: "",
    sponsor_url_active: false,
    is_active: false,
    vote_multiplier: 0,
    show_results: true,
    countdown_enabled: false,
    countdown_minutes: 0,
  });

  useEffect(() => {
    loadPolls();
  }, []);

  // Live countdown ticker
  useEffect(() => {
    if (polls.length === 0) return;
    const tick = () => {
      const next: { [key: number]: string } = {};
      polls.forEach((poll) => {
        if (!poll.countdown_end) return;
        const diff = new Date(poll.countdown_end).getTime() - Date.now();
        if (diff > 0) {
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          next[poll.id] = h > 0
            ? `${h}ω ${m.toString().padStart(2, "0")}λ`
            : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        } else {
          next[poll.id] = "ΛΗΞΕ";
        }
      });
      setCountdowns(next);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [polls]);

  async function loadPolls() {
    setLoading(true);
    const { data } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });
    setPolls(data || []);
    setLoading(false);
    if (data) {
      const votes: { [key: number]: number } = {};
      for (const poll of data) {
        const { count } = await supabase
          .from("poll_votes")
          .select("*", { count: "exact", head: true })
          .eq("poll_id", poll.id);
        votes[poll.id] = count || 0;
      }
      setPollVotes(votes);
    }
  }

  async function savePoll() {
    setSaving(true);
    const { countdown_enabled, countdown_minutes, ...pollData } = form as any;
    if (editingPoll) {
      await supabase.from("polls").update(pollData).eq("id", editingPoll.id);
    } else {
      await supabase.from("polls").insert(pollData);
    }
    // If countdown enabled and poll will be active, set countdown_end
    if (countdown_enabled && countdown_minutes > 0) {
      const targetId = editingPoll?.id;
      if (targetId) {
        const countdown_end = new Date(Date.now() + countdown_minutes * 60000).toISOString();
        await supabase.from("polls").update({ countdown_end }).eq("id", targetId);
      }
    }
    setSaving(false);
    closeModal();
    loadPolls();
  }

  async function deletePoll(id: number) {
    if (!confirm("Διαγραφή poll;")) return;
    await supabase.from("polls").delete().eq("id", id);
    loadPolls();
  }

  async function toggleActive(poll: any) {
    if (!poll.is_active) {
      // Απενεργοποίηση όλων των άλλων
      await supabase.from("polls").update({ is_active: false }).neq("id", poll.id);
      const minutes = countdownInput[poll.id] || 0;
      const countdown_end =
        minutes > 0
          ? new Date(Date.now() + minutes * 60000).toISOString()
          : null;
      await supabase
        .from("polls")
        .update({ is_active: true, countdown_end })
        .eq("id", poll.id);
    } else {
      await supabase
        .from("polls")
        .update({ is_active: false, countdown_end: null })
        .eq("id", poll.id);
    }
    loadPolls();
  }

  async function clearCountdown(pollId: number) {
    await supabase
      .from("polls")
      .update({ countdown_end: null })
      .eq("id", pollId);
    setCountdownInput((prev) => ({ ...prev, [pollId]: 0 }));
    loadPolls();
  }

  async function clearVotes(pollId: number) {
    if (!confirm("Διαγραφή όλων των ψήφων για αυτό το poll;")) return;
    await supabase.from("poll_votes").delete().eq("poll_id", pollId);
    setPollVotes((prev) => ({ ...prev, [pollId]: 0 }));
  }

  function openEdit(poll: any) {
    setEditingPoll(poll);
    setForm({
      question: poll.question || "",
      option_1: poll.option_1 || "",
      option_2: poll.option_2 || "",
      option_3: poll.option_3 || "",
      option_4: poll.option_4 || "",
      sponsor_name: poll.sponsor_name || "",
      sponsor_url: poll.sponsor_url || "",
      sponsor_url_active: poll.sponsor_url_active || false,
      is_active: poll.is_active || false,
      vote_multiplier: poll.vote_multiplier || 0,
      show_results: poll.show_results !== false,
      countdown_enabled: false,
      countdown_minutes: 0,
    });
    setShowModal(true);
  }

  function openNew() {
    setEditingPoll(null);
    setForm({
      question: "",
      option_1: "",
      option_2: "",
      option_3: "",
      option_4: "",
      sponsor_name: "",
      sponsor_url: "",
      sponsor_url_active: false,
      is_active: false,
      vote_multiplier: 0,
      show_results: true,
      countdown_enabled: false,
      countdown_minutes: 0,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingPoll(null);
  }

  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <button
      onClick={onChange}
      style={{
        width: 48,
        height: 26,
        borderRadius: 13,
        background: checked ? "#22c55e" : "#d1d5db",
        border: "none",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          background: "white",
          borderRadius: "50%",
          position: "absolute",
          top: 3,
          left: checked ? 25 : 3,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header
          style={{
            background: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>📊</span>
            <div>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#1f2937" }}>
                Polls
              </span>
              <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
                Ψηφοφορίες για την αρχική οθόνη της εφαρμογής
              </p>
            </div>
          </div>
          <button
            onClick={openNew}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #e53935, #c62828)",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>+</span> Νέο Poll
          </button>
        </header>

        {/* Content */}
        <div style={{ padding: 28, flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
              Φόρτωση...
            </div>
          ) : polls.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: "#6b7280",
                background: "white",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <p style={{ fontWeight: 600, fontSize: 16, color: "#374151" }}>
                Δεν υπάρχουν polls
              </p>
              <p style={{ fontSize: 14 }}>Δημιούργησε το πρώτο poll!</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {polls.map((poll) => {
                const realVotes = pollVotes[poll.id] || 0;
                const displayVotes = realVotes + (poll.vote_multiplier || 0);
                const hasCountdown = !!countdowns[poll.id];
                const countdownExpired = countdowns[poll.id] === "ΛΗΞΕ";
                const countdownActive =
                  hasCountdown && !countdownExpired;

                return (
                  <div
                    key={poll.id}
                    style={{
                      background: "white",
                      borderRadius: 16,
                      padding: 20,
                      border: poll.is_active
                        ? "2px solid #22c55e"
                        : "1px solid #e5e7eb",
                      boxShadow: poll.is_active
                        ? "0 0 0 4px rgba(34,197,94,0.08)"
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                      }}
                    >
                      {/* Left: Info */}
                      <div style={{ flex: 1 }}>
                        {/* Title row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontSize: 18 }}>📊</span>
                          <p
                            style={{
                              fontWeight: 700,
                              color: "#1f2937",
                              margin: 0,
                              fontSize: 15,
                            }}
                          >
                            {poll.question}
                          </p>
                          {poll.is_active && (
                            <span
                              style={{
                                background: "#22c55e",
                                color: "white",
                                padding: "3px 10px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              ● ΕΝΕΡΓΟ
                            </span>
                          )}
                          {countdownActive && (
                            <span
                              style={{
                                background: "#e53935",
                                color: "white",
                                padding: "3px 10px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              ⏱ {countdowns[poll.id]}
                            </span>
                          )}
                          {countdownExpired && (
                            <span
                              style={{
                                background: "#6b7280",
                                color: "white",
                                padding: "3px 10px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              ⏱ ΛΗΞΕ
                            </span>
                          )}
                        </div>

                        {/* Options */}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 10,
                          }}
                        >
                          {[
                            poll.option_1,
                            poll.option_2,
                            poll.option_3,
                            poll.option_4,
                          ]
                            .filter(Boolean)
                            .map((opt, i) => (
                              <span
                                key={i}
                                style={{
                                  background: "#f3f4f6",
                                  padding: "4px 12px",
                                  borderRadius: 8,
                                  fontSize: 12,
                                  color: "#374151",
                                  fontWeight: 500,
                                }}
                              >
                                {opt}
                              </span>
                            ))}
                        </div>

                        {/* Sponsor */}
                        {poll.sponsor_name && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "#f59e0b",
                              margin: "0 0 8px 0",
                              fontWeight: 600,
                            }}
                          >
                            💰 Sponsored by: {poll.sponsor_name}
                          </p>
                        )}

                        {/* Votes */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 14,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={() =>
                              setShowVotes((prev) => ({
                                ...prev,
                                [poll.id]: !prev[poll.id],
                              }))
                            }
                            style={{
                              padding: "5px 12px",
                              background: showVotes[poll.id] ? "#e53935" : "#f3f4f6",
                              color: showVotes[poll.id] ? "white" : "#374151",
                              border: "none",
                              borderRadius: 8,
                              fontSize: 12,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            🗳️ {showVotes[poll.id] ? "Απόκρυψη ψήφων" : "Εμφάνιση ψήφων"}
                          </button>
                          {showVotes[poll.id] && (
                            <>
                              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                                Αληθινές:{" "}
                                <strong style={{ color: "#1f2937" }}>{realVotes}</strong>
                                {" "}&nbsp;|&nbsp;{" "}
                                Εμφανίζονται:{" "}
                                <strong style={{ color: "#e53935" }}>{displayVotes}</strong>
                              </p>
                              {realVotes > 0 && (
                                <button
                                  onClick={() => clearVotes(poll.id)}
                                  style={{
                                    padding: "5px 10px",
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                    border: "1px solid #fca5a5",
                                    borderRadius: 8,
                                    fontSize: 11,
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                >
                                  🗑 Καθαρισμός
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Countdown section */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: countdownActive ? "rgba(229,57,53,0.08)" : "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb", flexWrap: "wrap", gap: 10 }}>
                          <div>
                            <p style={{ fontWeight: 600, color: "#1f2937", margin: 0, fontSize: 13 }}>⏱ Αντίστροφη μέτρηση</p>
                            <p style={{ color: "#6b7280", fontSize: 11, margin: 0 }}>
                              {countdownActive ? `✅ ${countdowns[poll.id]} απομένει` : countdownExpired ? "⛔ Έληξε" : "🚫 Ανενεργή"}
                            </p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {!poll.countdown_end && (
                              <input
                                type="number"
                                min="1"
                                value={countdownInput[poll.id] || ""}
                                onChange={(e) => setCountdownInput((prev) => ({ ...prev, [poll.id]: parseInt(e.target.value) || 0 }))}
                                placeholder="λεπτά"
                                style={{ width: 70, padding: "5px 8px", border: "2px solid #e53935", borderRadius: 8, fontSize: 13, outline: "none" }}
                              />
                            )}
                            <Toggle
                              checked={!!poll.countdown_end && !countdownExpired}
                              onChange={async () => {
                                if (poll.countdown_end && !countdownExpired) {
                                  await supabase.from("polls").update({ countdown_end: null }).eq("id", poll.id);
                                  loadPolls();
                                } else {
                                  const minutes = countdownInput[poll.id] || 0;
                                  if (minutes <= 0) return;
                                  const countdown_end = new Date(Date.now() + minutes * 60000).toISOString();
                                  await supabase.from("polls").update({ countdown_end }).eq("id", poll.id);
                                  loadPolls();
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          minWidth: 130,
                        }}
                      >
                        <button
                          onClick={() => toggleActive(poll)}
                          style={{
                            padding: "10px 16px",
                            background: poll.is_active ? "#fef2f2" : "#22c55e",
                            color: poll.is_active ? "#dc2626" : "white",
                            border: poll.is_active
                              ? "1px solid #fca5a5"
                              : "none",
                            borderRadius: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          {poll.is_active ? "⏹ Απενεργ." : "▶ Ενεργοπ."}
                        </button>
                        <button
                          onClick={async () => {
                            await supabase.from("polls").update({ show_results: !poll.show_results }).eq("id", poll.id);
                            loadPolls();
                          }}
                          style={{
                            padding: "10px 16px",
                            background: poll.show_results !== false ? "#eff6ff" : "#f3f4f6",
                            color: poll.show_results !== false ? "#3b82f6" : "#6b7280",
                            border: poll.show_results !== false ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
                            borderRadius: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          {poll.show_results !== false ? "📊 Αποτελέσματα ON" : "🚫 Αποτελέσματα OFF"}
                        </button>
                        <button
                          onClick={() => openEdit(poll)}
                          style={{
                            padding: "10px 16px",
                            background: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          ✏️ Επεξεργ.
                        </button>
                        <button
                          onClick={() => deletePoll(poll.id)}
                          style={{
                            padding: "10px 16px",
                            background: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            borderRadius: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          🗑 Διαγραφή
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: 32,
              width: 540,
              maxWidth: "95%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 24,
                color: "#1f2937",
              }}
            >
              {editingPoll ? "✏️ Επεξεργασία Poll" : "📊 Νέο Poll"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Ερώτηση */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Ερώτηση *
                </label>
                <input
                  type="text"
                  value={form.question}
                  onChange={(e) =>
                    setForm({ ...form, question: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: 12,
                    fontSize: 14,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  placeholder="π.χ. Ποιο είδος μουσικής προτιμάς;"
                />
              </div>

              {/* Επιλογές */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Επιλογές (τουλάχιστον 2)
                </label>
                <div
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
                >
                  {(["option_1", "option_2", "option_3", "option_4"] as const).map(
                    (key, i) => (
                      <div key={key}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            color: "#6b7280",
                            marginBottom: 4,
                          }}
                        >
                          Επιλογή {i + 1} {i < 2 ? "*" : "(προαιρετικό)"}
                        </label>
                        <input
                          type="text"
                          value={form[key]}
                          onChange={(e) =>
                            setForm({ ...form, [key]: e.target.value })
                          }
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            border: "2px solid #e5e7eb",
                            borderRadius: 10,
                            fontSize: 14,
                            boxSizing: "border-box",
                            outline: "none",
                          }}
                          placeholder={
                            ["Rock", "Pop", "Hip-Hop", "Electronic"][i]
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Vote Multiplier */}
              <div
                style={{
                  borderTop: "2px solid #e5e7eb",
                  paddingTop: 16,
                }}
              >
                <p
                  style={{
                    fontWeight: 600,
                    color: "#1f2937",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🗳️ Ψήφοι Multiplier
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                  Προσθέτει εικονικές ψήφους στην εμφάνιση (0 = μόνο αληθινές)
                </p>
                <input
                  type="number"
                  min="0"
                  value={form.vote_multiplier}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      vote_multiplier: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #e5e7eb",
                    borderRadius: 12,
                    fontSize: 14,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  placeholder="0"
                />
              </div>

              {/* Show Results + Countdown toggles */}
              <div style={{ borderTop: "2px solid #e5e7eb", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontWeight: 600, color: "#1f2937", margin: "0 0 4px 0", fontSize: 13 }}>⚙️ Επιλογές</p>

                {/* Show Results */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: form.show_results ? "rgba(59,130,246,0.08)" : "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                  <div>
                    <p style={{ fontWeight: 600, color: "#1f2937", margin: 0, fontSize: 13 }}>📊 Εμφάνιση ψήφων</p>
                    <p style={{ color: "#6b7280", fontSize: 11, margin: 0 }}>{form.show_results ? "✅ Οι χρήστες βλέπουν % ψήφων" : "🚫 Κρυμμένα τα αποτελέσματα"}</p>
                  </div>
                  <Toggle checked={form.show_results} onChange={() => setForm({ ...form, show_results: !form.show_results })} />
                </div>

                {/* Countdown */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: form.countdown_enabled ? "rgba(229,57,53,0.08)" : "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                  <div>
                    <p style={{ fontWeight: 600, color: "#1f2937", margin: 0, fontSize: 13 }}>⏱ Αντίστροφη μέτρηση</p>
                    <p style={{ color: "#6b7280", fontSize: 11, margin: 0 }}>{form.countdown_enabled ? "✅ Θα ξεκινήσει με την ενεργοποίηση" : "🚫 Χωρίς χρονόμετρο"}</p>
                  </div>
                  <Toggle checked={!!form.countdown_enabled} onChange={() => setForm({ ...form, countdown_enabled: !form.countdown_enabled })} />
                </div>
                {form.countdown_enabled && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "#fef2f2", borderRadius: 10 }}>
                    <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>Διάρκεια:</span>
                    <input
                      type="number"
                      min="1"
                      value={form.countdown_minutes || ""}
                      onChange={(e) => setForm({ ...form, countdown_minutes: parseInt(e.target.value) || 0 })}
                      placeholder="λεπτά"
                      style={{ width: 80, padding: "6px 10px", border: "2px solid #e53935", borderRadius: 8, fontSize: 13, outline: "none" }}
                    />
                    <span style={{ fontSize: 12, color: "#6b7280" }}>λεπτά</span>
                  </div>
                )}
              </div>

              {/* Sponsor */}
              <div
                style={{
                  borderTop: "2px solid #f59e0b",
                  paddingTop: 16,
                }}
              >
                <p
                  style={{
                    fontWeight: 600,
                    color: "#1f2937",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  💰 Χορηγός Poll
                </p>
                <input
                  type="text"
                  value={form.sponsor_name}
                  onChange={(e) =>
                    setForm({ ...form, sponsor_name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #f59e0b",
                    borderRadius: 12,
                    fontSize: 14,
                    background: "#fffbeb",
                    marginBottom: 12,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  placeholder="Όνομα χορηγού (προαιρετικό)"
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: form.sponsor_url_active
                      ? "rgba(59,130,246,0.08)"
                      : "#f9fafb",
                    borderRadius: 10,
                    marginBottom: 12,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontWeight: 600,
                        color: "#1f2937",
                        margin: 0,
                        fontSize: 13,
                      }}
                    >
                      🔗 Link χορηγού
                    </p>
                    <p style={{ color: "#6b7280", fontSize: 11, margin: 0 }}>
                      {form.sponsor_url_active ? "✅ Clickable" : "Απενεργοποιημένο"}
                    </p>
                  </div>
                  <Toggle
                    checked={form.sponsor_url_active}
                    onChange={() =>
                      setForm({
                        ...form,
                        sponsor_url_active: !form.sponsor_url_active,
                      })
                    }
                  />
                </div>
                {form.sponsor_url_active && (
                  <input
                    type="text"
                    value={form.sponsor_url}
                    onChange={(e) =>
                      setForm({ ...form, sponsor_url: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "2px solid #3b82f6",
                      borderRadius: 12,
                      fontSize: 14,
                      background: "#eff6ff",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                    placeholder="https://example.com"
                  />
                )}
              </div>
            </div>

            {/* Modal buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button
                onClick={closeModal}
                style={{
                  flex: 1,
                  padding: 14,
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Ακύρωση
              </button>
              <button
                onClick={savePoll}
                disabled={saving || !form.question || !form.option_1 || !form.option_2}
                style={{
                  flex: 1,
                  padding: 14,
                  background:
                    saving || !form.question || !form.option_1 || !form.option_2
                      ? "#d1d5db"
                      : "linear-gradient(135deg, #e53935, #c62828)",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    saving || !form.question ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Αποθήκευση..." : "💾 Αποθήκευση"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
