import { supabase } from './supabase'

export type UserRole = 'owner' | 'admin' | 'producer'

export interface DashboardUser {
  id: string
  username: string
  display_name: string
  role: UserRole
  producer_id?: string
  is_active: boolean
}

export interface AuthResult {
  success: boolean
  user?: DashboardUser
  error?: string
  token?: string
}

// Login function
export async function login(username: string, password: string): Promise<AuthResult> {
  try {
    // Check if user exists and is active
    const { data: user, error } = await supabase
      .from('dashboard_users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (error || !user) {
      await logAudit(null, 'login_failed', { username, reason: 'user_not_found' })
      return { success: false, error: 'Λάθος στοιχεία σύνδεσης' }
    }

    // Check if locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return { success: false, error: 'Ο λογαριασμός είναι κλειδωμένος. Δοκιμάστε αργότερα.' }
    }

    // Check password (simple comparison - use bcrypt in production!)
    if (user.password_hash !== password) {
      // Increment failed attempts
      const attempts = (user.failed_login_attempts || 0) + 1
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null

      await supabase
        .from('dashboard_users')
        .update({ 
          failed_login_attempts: attempts,
          locked_until: lockUntil
        })
        .eq('id', user.id)

      await logAudit(user.id, 'login_failed', { reason: 'wrong_password', attempts })
      return { success: false, error: 'Λάθος στοιχεία σύνδεσης' }
    }

    // For producers, check time window
    if (user.role === 'producer') {
      const canAccess = await checkProducerTimeWindow(user.producer_id)
      if (!canAccess.allowed) {
        await logAudit(user.id, 'login_denied_time', { reason: canAccess.reason })
        return { success: false, error: canAccess.reason }
      }
    }

    // Create session token
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await supabase.from('dashboard_sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString()
    })

    // Reset failed attempts and update last login
    await supabase
      .from('dashboard_users')
      .update({ 
        failed_login_attempts: 0,
        locked_until: null,
        last_login: new Date().toISOString()
      })
      .eq('id', user.id)

    await logAudit(user.id, 'login_success', { role: user.role })

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        producer_id: user.producer_id,
        is_active: user.is_active
      },
      token
    }
  } catch (e) {
    console.error('Login error:', e)
    return { success: false, error: 'Σφάλμα σύνδεσης' }
  }
}

// Verify session
export async function verifySession(token: string): Promise<DashboardUser | null> {
  if (!token) return null

  try {
    const { data: session } = await supabase
      .from('dashboard_sessions')
      .select('*, dashboard_users(*)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session || !session.dashboard_users) return null

    const user = session.dashboard_users as any

    // For producers, re-check time window
    if (user.role === 'producer') {
      const canAccess = await checkProducerTimeWindow(user.producer_id)
      if (!canAccess.allowed) return null
    }

    return {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      producer_id: user.producer_id,
      is_active: user.is_active
    }
  } catch {
    return null
  }
}

// Logout
export async function logout(token: string): Promise<void> {
  if (!token) return
  await supabase.from('dashboard_sessions').delete().eq('token', token)
}

// Check producer time window
export async function checkProducerTimeWindow(producerId?: string): Promise<{ allowed: boolean; reason?: string; showInfo?: any }> {
  if (!producerId) {
    return { allowed: false, reason: 'Δεν έχετε συνδεδεμένη εκπομπή' }
  }

  try {
    // Get producer's shows
    const { data: shows } = await supabase
      .from('shows')
      .select('*')
      .eq('producer_id', producerId)

    if (!shows || shows.length === 0) {
      return { allowed: false, reason: 'Δεν έχετε προγραμματισμένη εκπομπή' }
    }

    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Europe/Athens' })
    const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Athens' })

    for (const show of shows) {
      if (show.day_of_week !== currentDay) continue

      const startTime = show.start_time // "HH:MM"
      const endTime = show.end_time // "HH:MM"

      // Calculate window: 15 min before start, 5 min after end
      const windowStart = subtractMinutes(startTime, 15)
      const windowEnd = addMinutes(endTime, 5)

      // Handle midnight crossing
      if (isTimeInRange(currentTime, windowStart, windowEnd, startTime > endTime)) {
        return { 
          allowed: true, 
          showInfo: {
            title: show.title,
            start: startTime,
            end: endTime
          }
        }
      }
    }

    // Find next show for message
    const nextShow = findNextShow(shows, now)
    if (nextShow) {
      return { 
        allowed: false, 
        reason: `Η πρόσβαση ανοίγει 15 λεπτά πριν την εκπομπή σου (${nextShow.day_of_week} ${nextShow.start_time})`
      }
    }

    return { allowed: false, reason: 'Δεν έχετε προγραμματισμένη εκπομπή σήμερα' }
  } catch {
    return { allowed: false, reason: 'Σφάλμα ελέγχου προγράμματος' }
  }
}

// Helper functions
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function subtractMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMinutes = h * 60 + m - minutes
  const newH = Math.floor(((totalMinutes % 1440) + 1440) % 1440 / 60)
  const newM = ((totalMinutes % 60) + 60) % 60
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMinutes = h * 60 + m + minutes
  const newH = Math.floor((totalMinutes % 1440) / 60)
  const newM = totalMinutes % 60
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
}

function isTimeInRange(current: string, start: string, end: string, crossesMidnight: boolean): boolean {
  if (crossesMidnight) {
    return current >= start || current <= end
  }
  return current >= start && current <= end
}

function findNextShow(shows: any[], now: Date): any {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const currentDayIndex = now.getDay()
  
  for (let i = 0; i < 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7
    const dayName = days[dayIndex]
    const dayShows = shows.filter(s => s.day_of_week === dayName)
    
    for (const show of dayShows.sort((a, b) => a.start_time.localeCompare(b.start_time))) {
      if (i === 0) {
        const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Athens' })
        if (show.start_time > currentTime) return show
      } else {
        return show
      }
    }
  }
  return null
}

// Audit logging
export async function logAudit(userId: string | null, action: string, details?: any): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      details
    })
  } catch (e) {
    console.error('Audit log error:', e)
  }
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
