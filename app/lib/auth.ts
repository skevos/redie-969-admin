// Client-safe auth types and helpers.
// Login / session / password checks now live on the server:
//   app/api/auth/*  (route handlers), app/lib/session.ts, app/lib/serverAuth.ts, app/lib/password.ts
// Nothing in the browser may read or write dashboard_users or producers.username/password.

export type UserRole = 'owner' | 'admin' | 'producer'

export interface DashboardUser {
  id: string
  username: string
  display_name: string
  role: UserRole
  producer_id?: string
  is_active: boolean
}

// Permission checks
export function canAccess(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

  // Owner can access everything
  if (userRole === 'owner') return true

  // Admin can access admin and producer stuff
  if (userRole === 'admin' && (roles.includes('admin') || roles.includes('producer'))) return true

  // Producer can only access producer stuff
  if (userRole === 'producer' && roles.includes('producer')) return true

  return false
}
