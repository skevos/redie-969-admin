"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  
  const menuItems = [
    { href: "/", icon: "🏠", label: "Dashboard" },
    { href: "/analytics", icon: "📊", label: "Analytics" },
    { href: "/admin", icon: "📅", label: "Πρόγραμμα" },
    { href: "/producers", icon: "👥", label: "Παραγωγοί" },
    { href: "/studio", icon: "💬", label: "Studio Chat" },
    { href: "/archives", icon: "📁", label: "Chat Archives" },
    { href: "/geo", icon: "🌍", label: "Geo Analytics" },
    { href: "/animations", icon: "✨", label: "Animations" },
    { href: "/notifications", icon: "🔔", label: "Notifications" },
    { href: "/content", icon: "📱", label: "App Content" },
    { href: "/polls", icon: "📊", label: "Polls" },
    { href: "/splash", icon: "🚀", label: "Splash Screen" },
    { href: "/presence", icon: "📡", label: "Presence Mode" },
    { href: "/presence-analytics", icon: "🎯", label: "Presence Stats" },
    { href: "/presence-geo", icon: "🗺️", label: "Geo Listeners" },
    { href: "/presence-geo-admin", icon: "⚙️", label: "Geo Boost" },
  ];

  return (
    <aside style={{ 
      width: 260, 
      background: 'white', 
      display: 'flex', 
      flexDirection: 'column', 
      position: 'fixed', 
      height: '100vh',
      zIndex: 20,
      borderRight: '1px solid #e5e7eb',
      boxShadow: '2px 0 12px rgba(0,0,0,0.03)'
    }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/logo.png" alt="REDIE 969" style={{ width: 56, height: 56, objectFit: 'contain' }} />
          <div>
            <span style={{ color: '#1f2937', fontWeight: 700, fontSize: 22 }}>REDIE</span>
            <span style={{ color: '#E53935', fontWeight: 700, fontSize: 22, marginLeft: 4 }}>969</span>
            <p style={{ color: '#9ca3af', fontSize: 11, margin: '2px 0 0', fontWeight: 500 }}>Admin Panel</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 14, 
                padding: '14px 16px', 
                borderRadius: 12, 
                background: isActive ? 'rgba(229,57,53,0.08)' : 'transparent',
                color: isActive ? '#E53935' : '#4b5563', 
                textDecoration: 'none', 
                marginBottom: 4,
                fontWeight: isActive ? 600 : 500,
                fontSize: 14,
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <div style={{ marginLeft: 'auto', width: 6, height: 6, background: '#E53935', borderRadius: '50%' }} />}
            </Link>
          );
        })}
      </nav>
      
      <div style={{ padding: 20, borderTop: '1px solid #f3f4f6' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.1) 0%, rgba(229,57,53,0.05) 100%)', borderRadius: 12, padding: 16 }}>
          <p style={{ color: '#E53935', fontSize: 12, margin: 0, fontWeight: 600 }}>REDIE 969</p>
          <p style={{ color: '#9ca3af', fontSize: 11, margin: '4px 0 0' }}>Admin Dashboard v2.0</p>
        </div>
      </div>
    </aside>
  );
}
