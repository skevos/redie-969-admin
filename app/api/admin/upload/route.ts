import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { jsonError, requireAdmin } from '../../../lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Upload to storage with the service role. multipart: file, bucket, path
const BUCKETS = new Set(['producers', 'splash', 'animations', 'notifications']);

export async function POST(req: NextRequest) {
  const s = await requireAdmin(req);
  if (s instanceof NextResponse) return s;
  try {
    const form = await req.formData();
    const file = form.get('file');
    const bucket = String(form.get('bucket') || '');
    const path = String(form.get('path') || '');
    if (!(file instanceof Blob)) return jsonError('No file', 400);
    if (!BUCKETS.has(bucket)) return jsonError('Bucket not allowed', 403);
    if (!/^[A-Za-z0-9_\-./]{1,200}$/.test(path) || path.includes('..')) return jsonError('Bad path', 400);
    if (file.size > 15 * 1024 * 1024) return jsonError('File too large', 413);
    const db = getSupabaseAdmin();
    const { error } = await db.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || undefined,
      cacheControl: String(form.get('cacheControl') || '31536000'),
      upsert: form.get('upsert') === 'true',
    });
    if (error) return jsonError(error.message, 400);
    const { data } = db.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ publicUrl: data.publicUrl, path });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
