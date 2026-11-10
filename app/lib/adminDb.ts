'use client';
// Dashboard writes, same syntax as supabase-js:
//   await adminDb.from('shows').update({ is_live: true }).eq('id', id)
//   const { data, error } = await adminDb.from('polls').insert(row).select('id').single()
// The request goes to /api/admin/db, which checks the admin session and writes with the
// service-role key — so the public anon key no longer needs write access to these tables.

type Result<T = any> = { data: T | null; error: { message: string; code?: string } | null };

class WriteBuilder implements PromiseLike<Result> {
  private filters: any[][] = [];
  private _select: string | null = null;
  private _single = false;
  constructor(private table: string, private op: string, private values?: any, private onConflict?: string) {}

  eq(col: string, v: any) { this.filters.push(['eq', col, v]); return this; }
  neq(col: string, v: any) { this.filters.push(['neq', col, v]); return this; }
  in(col: string, v: any[]) { this.filters.push(['in', col, v]); return this; }
  is(col: string, v: any) { this.filters.push(['is', col, v]); return this; }
  gt(col: string, v: any) { this.filters.push(['gt', col, v]); return this; }
  gte(col: string, v: any) { this.filters.push(['gte', col, v]); return this; }
  lt(col: string, v: any) { this.filters.push(['lt', col, v]); return this; }
  lte(col: string, v: any) { this.filters.push(['lte', col, v]); return this; }
  or(expr: string) { this.filters.push(['or', expr]); return this; }
  select(cols = '*') { this._select = cols; return this; }
  single() { this._single = true; return this; }

  private async run(): Promise<Result> {
    try {
      const r = await fetch('/api/admin/db', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: this.table, op: this.op, values: this.values, filters: this.filters, select: this._select, single: this._single, onConflict: this.onConflict }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { data: null, error: { message: j?.error || `HTTP ${r.status}` } };
      return { data: j.data ?? null, error: j.error ?? null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Network error' } };
    }
  }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, fail?: ((e: any) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return this.run().then(ok, fail);
  }
}

export const adminDb = {
  from(table: string) {
    return {
      insert: (values: any) => new WriteBuilder(table, 'insert', values),
      upsert: (values: any, opts?: { onConflict?: string }) => new WriteBuilder(table, 'upsert', values, opts?.onConflict),
      update: (values: any) => new WriteBuilder(table, 'update', values),
      delete: () => new WriteBuilder(table, 'delete'),
    };
  },
};

/** Upload a file to storage through the server. Returns { publicUrl } or { error }. */
export async function adminUpload(bucket: string, path: string, file: Blob, opts?: { cacheControl?: string; upsert?: boolean }): Promise<{ publicUrl?: string; error?: { message: string } }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('bucket', bucket);
  fd.append('path', path);
  if (opts?.cacheControl) fd.append('cacheControl', opts.cacheControl);
  if (opts?.upsert) fd.append('upsert', 'true');
  try {
    const r = await fetch('/api/admin/upload', { method: 'POST', credentials: 'same-origin', body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: { message: j?.error || `HTTP ${r.status}` } };
    return { publicUrl: j.publicUrl };
  } catch (e: any) {
    return { error: { message: e?.message || 'Network error' } };
  }
}
