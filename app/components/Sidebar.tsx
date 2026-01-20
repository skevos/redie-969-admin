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
    { href: "/notifications", icon: "🔔", label: "Notifications" },
    { href: "/content", icon: "📱", label: "App Content" },
    { href: "/splash", icon: "🚀", label: "Splash Screen" },
  ];

  return (
    <aside style={{ 
      width: 240, 
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', 
      display: 'flex', 
      flexDirection: 'column', 
      position: 'fixed', 
      height: '100vh',
      zIndex: 20,
      boxShadow: '4px 0 20px rgba(0,0,0,0.1)'
    }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 44, height: 44, 
            background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', 
            borderRadius: 12, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(229, 57, 53, 0.4)'
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>R</span>
          </div>
          <div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>REDIE</span>
            <span style={{ color: '#e53935', fontWeight: 700, fontSize: 18, marginLeft: 4 }}>969</span>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '20px 12px' }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                padding: '12px 14px', 
                borderRadius: 12, 
                background: isActive ? 'rgba(229,57,53,0.15)' : 'transparent',
                color: isActive ? '#e53935' : 'rgba(255,255,255,0.7)', 
                textDecoration: 'none', 
                marginBottom: 4 
              }}
            >
              <span>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>REDIE 969 Admin v1.0</p>
      </div>
    </aside>
  );
}
