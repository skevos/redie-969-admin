import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getProducerSession, jsonError, secretMissing } from '../../../lib/serverAuth';
import { getSessionSecret } from '../../../lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A logged-in producer posts in the live chat. Name, photo and colours come from the
// producers table on the server, so nobody can post as a producer with the public key.
export async function POST(req: NextRequest) {
  if (!getSessionSecret()) return secretMissing();
  const s = await getProducerSession(req);
  if (!s) return jsonError('Unauthorized', 401);
  let body: any;
  try { body = await req.json(); } catch { return jsonError('Bad JSON', 400); }
  const roomId = String(body?.room_id || '');
  const message = String(body?.message || '').trim();
  if (!roomId || !message) return jsonError('Empty message', 400);
  if (message.length > 1000) return jsonError('Message too long', 400);
  try {
    const db = getSupabaseAdmin();
    const { data: p } = await db.from('producers')
      .select('id, name, photo_url, show_1, chat_color, chat_icon, is_active')
      .eq('id', s.uid).maybeSingle();
    if (!p || p.is_active === false) return jsonError('Unauthorized', 401);
    const { data: room } = await db.from('chat_rooms').select('id').eq('id', roomId).maybeSingle();
    if (!room) return jsonError('Room not found', 404);
    const { error } = await db.from('chat_messages').insert({
      room_id: roomId, nickname_snapshot: p.name, role_snapshot: 'producer', message,
      producer_id: p.id, show_name: p.show_1 || null, chat_color: p.chat_color || '#9C27B0',
      chat_icon: p.chat_icon || 'headphones', producer_photo: p.photo_url || null,
    });
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || 'Server error', 500);
  }
}
