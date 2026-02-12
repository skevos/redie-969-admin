"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { label: "Dashboard", href: "/", icon: "📊" },
  { label: "Analytics", href: "/analytics", icon: "📈" },
  { label: "Πρόγραμμα", href: "/admin", icon: "📅" },
  { label: "Παραγωγοί", href: "/producers", icon: "🎙️" },
  { label: "Studio Chat", href: "/studio", icon: "🎛️" },
  { label: "Chat", href: "/chat", icon: "💬" },
  { label: "Producer Chat", href: "/producer-chat", icon: "🗨️" },
  { label: "Archives", href: "/archives", icon: "📁" },
  { label: "Notifications", href: "/notifications", icon: "🔔" },
  { label: "Polls", href: "/polls", icon: "📊" },
  { label: "Animations", href: "/animations", icon: "✨" },
  { label: "Content", href: "/content", icon: "📝" },
  { label: "Splash Screen", href: "/splash", icon: "🎨" },
  { label: "Geo", href: "/geo", icon: "🌍" },
  { label: "Users", href: "/users", icon: "👥" },
  { type: "divider", label: "PRESENCE MODE" },
  { label: "Presence", href: "/presence", icon: "📡" },
  { label: "Presence Analytics", href: "/presence-analytics", icon: "📊" },
  { label: "Presence Geo", href: "/presence-geo", icon: "🗺️" },
  { label: "Presence Admin", href: "/presence-geo-admin", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div style={{
      width: 260,
      height: "100vh",
      background: "#0f172a",
      borderRight: "1px solid #1e293b",
      position: "fixed",
      top: 0,
      left: 0,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #1e293b" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#ef4444", letterSpacing: 1 }}>
            REDIE 969
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b", letterSpacing: 0.5 }}>Admin Dashboard</p>
        </Link>
      </div>

      {/* Menu */}
      <nav style={{ padding: "12px 8px", flex: 1 }}>
        {menuItems.map((item, i) => {
          if ((item as any).type === "divider") {
            return (
              <div key={i} style={{ padding: "16px 12px 8px", fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase" }}>
                {item.label}
              </div>
            );
          }
          
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href!} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                marginBottom: 2,
                background: isActive ? "#1e293b" : "transparent",
                color: isActive ? "white" : "#94a3b8",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #1e293b", fontSize: 11, color: "#475569" }}>
        © 2026 REDIE 969
      </div>
    </div>
  );
}
