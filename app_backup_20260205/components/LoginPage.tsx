"use client";
import { useState } from "react";
import { login } from "../lib/auth";

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);

    if (result.success && result.token) {
      localStorage.setItem("dashboard_token", result.token);
      localStorage.setItem("dashboard_user", JSON.stringify(result.user));
      onLogin(result.token);
    } else {
      setError(result.error || "Σφάλμα σύνδεσης");
    }

    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: 40,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 70,
            height: 70,
            background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 32px rgba(229, 57, 53, 0.4)'
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 28 }}>R</span>
          </div>
          <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, margin: 0 }}>
            REDIE <span style={{ color: '#e53935' }}>969</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>
            Dashboard Login
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Εισάγετε username"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: 'white',
                fontSize: 15,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#e53935'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Εισάγετε password"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: 'white',
                fontSize: 15,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#e53935'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 10,
              marginBottom: 20
            }}>
              <p style={{ color: '#ef4444', fontSize: 14, margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: loading ? '#666' : 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(229, 57, 53, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {loading ? 'Σύνδεση...' : 'Σύνδεση'}
          </button>
        </form>

        {/* Footer */}
        <p style={{ 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.3)', 
          fontSize: 12, 
          marginTop: 32 
        }}>
          © 2026 REDIE 969 • Dashboard
        </p>
      </div>
    </div>
  );
}
