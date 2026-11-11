import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { NextResponse } from 'next/server';
import { resolveAutoMessages, fillTemplate } from '../../lib/autoMessages';

export const maxDuration = 60;

// Service role: this cron route writes chat_rooms / chat_config / app_notifications / shows,
// which the public anon key can no longer change (database lock, 11/11/2026).
const supabase = getSupabaseAdmin();

const CHUNK_SIZE = 300;

// Fetch all rows past the 1000-row PostgREST cap
async function fetchAll<T = any>(buildQuery: () => any): Promise<T[]> {
  const pageSize = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) break;
    all.push(...((data || []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return all;
}

// Send via the existing FCM route: one request, the server loads all tokens itself
async function sendPushToAll(request: Request, title: string, body: string) {
  try {
    const url = new URL('/api/send-notification', request.url);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.SESSION_SECRET || '' },
      body: JSON.stringify({ toAll: true, title, body })
    });
    return response.ok;
  } catch (e) {
    console.error('Push error:', e);
    return false;
  }
}

// Push + in-app history, unless the title was left empty in App Content
async function notify(request: Request, title: string, body: string) {
  if (!title) return;
  await sendPushToAll(request, title, body);
  await supabase.from('app_notifications').insert({ title, body, type: 'chat' });
}

async function getAutoMessages() {
  try {
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
    return resolveAutoMessages(data);
  } catch {
    return resolveAutoMessages(null);
  }
}

// Current weekday (0=Monday) and time in Athens
function getAthensNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const day = Math.max(0, weekdays.indexOf(get('weekday')));
  const hours = parseInt(get('hour'), 10) % 24;
  const minutes = parseInt(get('minute'), 10);
  return { day, hours, minutes };
}

function toMinutes(t: string) {
  const [h, m] = String(t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// [start, end) in minutes; a show ending at or before its start runs past midnight
function showRange(show: any) {
  const start = toMinutes(show.start_time);
  let end = toMinutes(show.end_time);
  if (end <= start) end += 1440;
  return { start, end };
}

export async function GET(request: Request) {
  try {
    const { data: config } = await supabase.from('chat_config').select('*').eq('id', 1).single();
    if (!config?.auto_mode) {
      return NextResponse.json({ message: 'Auto mode disabled' });
    }

    const athens = getAthensNow();
    const currentDay = athens.day;
    const currentHours = athens.hours;
    const currentMinutes = athens.minutes;
    const currentTimeMinutes = currentHours * 60 + currentMinutes;
    const yesterday = (currentDay + 6) % 7;
    const tomorrow = (currentDay + 1) % 7;
    const currentTime = String(currentHours).padStart(2, '0') + ':' + String(currentMinutes).padStart(2, '0');
    
    const { data: todayShows } = await supabase
      .from('shows')
      .select('*')
      .eq('day_of_week', currentDay)
      .order('start_time');

    const { data: yesterdayShows } = await supabase
      .from('shows')
      .select('*')
      .eq('day_of_week', yesterday)
      .order('start_time');

    const { data: tomorrowShows } = await supabase
      .from('shows')
      .select('*')
      .eq('day_of_week', tomorrow)
      .order('start_time');

    const currentShow = todayShows?.find(show => {
      const { start, end } = showRange(show);
      return currentTimeMinutes >= start && currentTimeMinutes < end;
    }) || yesterdayShows?.find(show => {
      // Yesterday's show still running past midnight
      const { start, end } = showRange(show);
      const t = currentTimeMinutes + 1440;
      return t >= start && t < end;
    });

    const upcomingShow = todayShows?.find(show => {
      const minutesUntilStart = showRange(show).start - currentTimeMinutes;
      return minutesUntilStart > 0 && minutesUntilStart <= 15;
    }) || tomorrowShows?.find(show => {
      // Show starting just after midnight
      const minutesUntilStart = showRange(show).start + 1440 - currentTimeMinutes;
      return minutesUntilStart > 0 && minutesUntilStart <= 15;
    });

    if (!config.is_chat_open && upcomingShow) {
      const { data: room } = await supabase.from('chat_rooms').insert({
        show_id: upcomingShow.id,
        show_name: upcomingShow.title,
        title: upcomingShow.title,
        starts_at: new Date().toISOString()
      }).select().single();

      if (room) {
        await supabase.from('chat_config').update({
          is_chat_open: true,
          active_room_id: room.id
        }).eq('id', 1);

        const msgs = await getAutoMessages();
        await notify(request,
          fillTemplate(msgs.msg_auto_soon_title, { show: upcomingShow.title }),
          fillTemplate(msgs.msg_auto_soon_body, { show: upcomingShow.title }));

        return NextResponse.json({ action: 'opened', show: upcomingShow.title, reason: '15 minutes before show' });
      }
    }

    if (!config.is_chat_open && currentShow) {
      const { data: room } = await supabase.from('chat_rooms').insert({
        show_id: currentShow.id,
        show_name: currentShow.title,
        title: currentShow.title,
        starts_at: new Date().toISOString()
      }).select().single();

      if (room) {
        await supabase.from('chat_config').update({
          is_chat_open: true,
          active_room_id: room.id
        }).eq('id', 1);

        const msgs = await getAutoMessages();
        await notify(request,
          fillTemplate(msgs.msg_auto_live_title, { show: currentShow.title }),
          fillTemplate(msgs.msg_auto_live_body, { show: currentShow.title }));

        return NextResponse.json({ action: 'opened', show: currentShow.title, reason: 'show currently running' });
      }
    }

    if (config.is_chat_open && !currentShow && !upcomingShow && config.active_room_id) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', config.active_room_id);

      if (messages && messages.length > 0) {
        await supabase.from('chat_archives').insert({
          room_id: config.active_room_id,
          messages: messages,
          total_messages: messages.length
        });
      }

      await supabase.from('chat_config').update({ is_chat_open: false }).eq('id', 1);
      await supabase.from('chat_rooms').update({
        is_closed: true,
        closed_at: new Date().toISOString()
      }).eq('id', config.active_room_id);

      // Show is over: clear any "Go Live" mark so the app stops showing LIVE
      await supabase.from('shows').update({ is_live: false }).eq('is_live', true);

      const { data: closedRoom } = await supabase.from('chat_rooms').select('show_name, title').eq('id', config.active_room_id).maybeSingle();
      const closedShow = closedRoom?.show_name || closedRoom?.title || '';
      const msgs = await getAutoMessages();
      await notify(request,
        fillTemplate(msgs.msg_auto_close_title, { show: closedShow }),
        fillTemplate(msgs.msg_auto_close_body, { show: closedShow }));

      return NextResponse.json({ action: 'closed', reason: 'no active or upcoming show' });
    }

    return NextResponse.json({ 
      action: 'none',
      chatOpen: config.is_chat_open,
      currentShow: currentShow?.title || null,
      upcomingShow: upcomingShow?.title || null,
      currentTime,
      currentDay
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
