'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()
  const links = [
    { href: '/chat', label: 'Chat', icon: '💬' },
    { href: '/studio', label: 'Studio', icon: '🎙️' },
    { href: '/notifications', label: 'Notifications', icon: '🔔' },
  ]

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center space-x-8 h-16">
          <Link href="/" className="text-2xl font-bold text-red-600">REDIE 969</Link>
          <div className="flex space-x-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg transition ${
                  pathname === link.href ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
