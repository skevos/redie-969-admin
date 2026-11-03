// Producer logins (username + bcrypt password) live in the server-only table producer_credentials,
// so the public producers table holds no secrets and the mobile app can read it freely.
// Until that table exists, the old producers.username/password columns are used.
import { SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'producer_credentials';

function missingTable(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '');
  return error.code === '42P01' || error.code === 'PGRST205' || (msg.includes(TABLE) && /does not exist|schema cache/i.test(msg));
}

export async function getAllUsernames(db: SupabaseClient): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  const { data: producers, error: pErr } = await db.from('producers').select('id');
  if (pErr) throw new Error(pErr.message);
  (producers || []).forEach((p: any) => { out[String(p.id)] = null; });
  const { data, error } = await db.from(TABLE).select('producer_id, username');
  if (missingTable(error)) {
    const old = await db.from('producers').select('id, username');
    if (old.error) throw new Error(old.error.message);
    (old.data || []).forEach((r: any) => { out[String(r.id)] = r.username ?? null; });
    return out;
  }
  if (error) throw new Error(error.message);
  (data || []).forEach((r: any) => { out[String(r.producer_id)] = r.username ?? null; });
  return out;
}

export async function getUsername(db: SupabaseClient, id: string | number): Promise<string | null> {
  const { data, error } = await db.from(TABLE).select('username').eq('producer_id', id).maybeSingle();
  if (missingTable(error)) {
    const old = await db.from('producers').select('username').eq('id', id).maybeSingle();
    if (old.error) throw new Error(old.error.message);
    return (old.data as any)?.username ?? null;
  }
  if (error) throw new Error(error.message);
  return (data as any)?.username ?? null;
}

// update: { username?: string|null, password?: bcrypt hash }
export async function setCredentials(db: SupabaseClient, id: string | number, update: { username?: string | null; password?: string }): Promise<void> {
  const probe = await db.from(TABLE).select('producer_id').eq('producer_id', id).maybeSingle();
  if (missingTable(probe.error)) {
    const { error } = await db.from('producers').update(update).eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  if (probe.error) throw new Error(probe.error.message);
  const { error } = probe.data
    ? await db.from(TABLE).update(update).eq('producer_id', id)
    : await db.from(TABLE).insert({ producer_id: Number(id), ...update });
  if (error) throw new Error(error.message);
}

// -> { producer_id, password } for an exact username, or null
export async function findLogin(db: SupabaseClient, username: string): Promise<{ producer_id: number; password: string | null } | null> {
  const { data, error } = await db.from(TABLE).select('producer_id, password').eq('username', username).maybeSingle();
  if (missingTable(error)) {
    const old = await db.from('producers').select('id, password').eq('username', username).maybeSingle();
    if (old.error) throw new Error(old.error.message);
    return old.data ? { producer_id: (old.data as any).id, password: (old.data as any).password } : null;
  }
  if (error) throw new Error(error.message);
  return data ? { producer_id: (data as any).producer_id, password: (data as any).password } : null;
}
