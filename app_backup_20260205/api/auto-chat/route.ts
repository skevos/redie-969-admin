import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function sendPushToAll(title: string, body: string) {
  try {
    const { data: tokens } = await supabase.from('push_tokens').select('token');
    if (!tokens || tokens.length === 0) return;
    
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokens.map(t => ({
        to: t.token,
        sound: 'default',
        title,
        body
      })))
    });
    return response.ok;
  } catch (e) {
    console.error('Push error:', e);
    return false;
  }
}

export async function GET() {
  try {
    const { data: config } = await supabase.from('chat_config').select('*').eq('id', 1).single();
    if (!config?.auto_mode) {
      return NextResponse.json({ message: 'Auto mode disabled' });
    }

    const now = new Date();
    const greekTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Athens' }));
    const currentDay = (greekTime.getDay() + 6) % 7;
    const currentHours = greekTime.getHours();
    const currentMinutes = greekTime.getMinutes();
    const currentTimeMinutes = currentHours * 60 + currentMinutes;
    const currentTime = String(currentHours).padStart(2, '0') + ':' + String(currentMinutes).padStart(2, '0');
    
    const { data: todayShows } = await supabase
      .from('shows')
      .select('*')
      .eq('day_of_week', currentDay)
      .order('start_time');

    const currentShow = todayShows?.find(show => {
      const [startH, startM] = show.start_time.split(':').map(Number);
      const [endH, endM] = show.end_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
    });

    const upcomingShow = todayShows?.find(show => {
      const [startH, startM] = show.start_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const minutesUntilStart = startMinutes - currentTimeMinutes;
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

        const notifTitle = '💬 Το Chat Άνοιξε!';
        const notifBody = 'Ξεκινάει σύντομα: ' + upcomingShow.title + ' - Έλα να μιλήσεις μαζί μας!';
        
        await sendPushToAll(notifTitle, notifBody);
        await supabase.from('app_notifications').insert({ title: notifTitle, body: notifBody, type: 'chat' });

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

        const notifTitle = '🎙️ Live Τώρα!';
        const notifBody = currentShow.title + ' - Έλα στο chat!';
        
        await sendPushToAll(notifTitle, notifBody);
        await supabase.from('app_notifications').insert({ title: notifTitle, body: notifBody, type: 'chat' });

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
