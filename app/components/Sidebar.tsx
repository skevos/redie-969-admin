"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Sidebar rule: white background, logo.png, "REDIE" black + "969" red, footer "REDIE 969 Admin Dashboard v2.0".
// Hover / narrow-window styles live in globals.css (.redie-*).

const SECTIONS: { title: string; items: { href: string; icon: string; label: string }[] }[] = [
  {
    title: 'Κύρια',
    items: [
      { href: "/", icon: "🏠", label: "Dashboard" },
      { href: "/stats", icon: "📈", label: "Στατιστικά" },
      { href: "/analytics", icon: "📊", label: "Analytics" },
    ],
  },
  {
    title: 'Στον αέρα',
    items: [
      { href: "/studio", icon: "💬", label: "Studio Chat" },
      { href: "/requests", icon: "🎵", label: "Αιτήματα" },
      { href: "/polls", icon: "🗳️", label: "Polls" },
      { href: "/animations", icon: "✨", label: "Animations" },
      { href: "/notifications", icon: "🔔", label: "Notifications" },
    ],
  },
  {
    title: 'Πρόγραμμα & περιεχόμενο',
    items: [
      { href: "/admin", icon: "📅", label: "Πρόγραμμα" },
      { href: "/producers", icon: "👥", label: "Παραγωγοί" },
      { href: "/content", icon: "📱", label: "App Content" },
      { href: "/splash", icon: "🚀", label: "Splash Screen" },
      { href: "/archives", icon: "📁", label: "Chat Archives" },
    ],
  },
  {
    title: 'Ακροατές',
    items: [
      { href: "/geo", icon: "🌍", label: "Geo Analytics" },
      { href: "/presence", icon: "📡", label: "Presence Mode" },
      { href: "/presence-analytics", icon: "🎯", label: "Presence Stats" },
      { href: "/presence-geo", icon: "🗺️", label: "Geo Listeners" },
      { href: "/presence-geo-admin", icon: "⚙️", label: "Geo Boost" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="redie-sidebar" style={{
      width: 260,
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      height: '100vh',
      zIndex: 20,
      borderRight: '1px solid #eceef3',
      boxShadow: '2px 0 16px rgba(16,24,40,0.03)'
    }}>
      <div className="redie-brand" style={{ padding: '22px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src="/logo.png" alt="REDIE 969" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        <div className="redie-brand-text">
          <span style={{ color: '#1f2937', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>REDIE</span>
          <span style={{ color: '#E53935', fontWeight: 800, fontSize: 22, marginLeft: 4, letterSpacing: '-0.02em' }}>969</span>
          <p style={{ color: '#9ca3af', fontSize: 11, margin: '2px 0 0', fontWeight: 500 }}>Admin Panel</p>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '6px 12px 16px', overflowY: 'auto' }}>
        {SECTIONS.map(section => (
          <div key={section.title}>
            <div className="redie-nav-section">{section.title}</div>
            {section.items.map(item => {
              const isActive = item.href === '/' ? pathname === '/' : pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`redie-nav-link${isActive ? ' active' : ''}`}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: isActive ? 'rgba(229,57,53,0.08)' : 'transparent',
                    color: isActive ? '#E53935' : '#4b5563',
                    textDecoration: 'none',
                    marginBottom: 2,
                    fontWeight: isActive ? 650 : 500,
                    fontSize: 14,
                    transition: 'background 0.15s ease, color 0.15s ease'
                  }}
                >
                  {isActive && <span style={{ position: 'absolute', left: -12, top: 8, bottom: 8, width: 3, borderRadius: 3, background: '#E53935' }} />}
                  <span style={{ fontSize: 17, width: 22, textAlign: 'center' }}>{item.icon}</span>
                  <span className="redie-nav-label">{item.label}</span>
                  {isActive && <span className="redie-nav-dot" style={{ marginLeft: 'auto', width: 6, height: 6, background: '#E53935', borderRadius: '50%' }} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="redie-footer" style={{ padding: 16, borderTop: '1px solid #f3f4f6' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.1) 0%, rgba(229,57,53,0.04) 100%)', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)', flexShrink: 0 }} />
          <div className="redie-footer-text">
            <p style={{ color: '#E53935', fontSize: 12, margin: 0, fontWeight: 700 }}>REDIE 969</p>
            <p style={{ color: '#9ca3af', fontSize: 11, margin: '2px 0 0' }}>Admin Dashboard v2.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
