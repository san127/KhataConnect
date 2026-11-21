import { supabase } from '../supabase/client';
import { unwrap } from '../supabase/rpc';
import type { AppNotification } from '../../types/models';

export async function listNotifications(uid: string): Promise<AppNotification[]> {
  return unwrap(await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(100)) as AppNotification[];
}
export async function unreadCount(uid: string): Promise<number> {
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false);
  return count ?? 0;
}
export async function markRead(id: string) { await supabase.from('notifications').update({ is_read: true }).eq('id', id); }
export async function markAllRead(uid: string) { await supabase.from('notifications').update({ is_read: true }).eq('user_id', uid).eq('is_read', false); }

/** Subscribe to realtime changes for the given tables; returns an unsubscribe fn. */
/** Subscribe to realtime changes for the given tables; returns an unsubscribe fn. */
// export function subscribeTables(
//   name: string,
//   tables: string[],
//   onChange: () => void,
//   userId?: string
// ) {
//   // Always create a fresh channel name to prevent reuse
//   const channelName = `${name}-${Date.now()}-${Math.random()
//     .toString(36)
//     .slice(2, 8)}`;

//   let ch = supabase.channel(channelName);

//   for (const table of tables) {
//     ch = ch.on(
//       'postgres_changes',
//       {
//         event: '*',
//         schema: 'public',
//         table,
//         ...(table === 'notifications' && userId
//           ? { filter: `user_id=eq.${userId}` }
//           : {}),
//       },
//       onChange
//     );
//   }

//   ch.subscribe((status, err) => {
//     if (status === 'CHANNEL_ERROR') {
//       console.error('Realtime subscription error:', err);
//     }

//     if (status === 'TIMED_OUT') {
//       console.error('Realtime subscription timed out');
//     }
//   });

//   return () => {
//     supabase.removeChannel(ch);
//   };
// }

/** Subscribe to realtime changes for the given tables. */
export function subscribeTables(
  name: string,
  tables: string[],
  onChange: () => void,
  userId?: string
) {
  const channelName = `${name}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  let channel = supabase.channel(channelName);

  for (const table of tables) {
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(table === 'notifications' && userId
          ? { filter: `user_id=eq.${userId}` }
          : {}),
      },
      (payload) => {
        console.log(`[Realtime] ${table} change:`, payload.eventType);
        onChange();
      }
    );
  }

  channel.subscribe((status, err) => {
    console.log(`[Realtime] ${channelName}: ${status}`);

    if (err) {
      console.error('[Realtime] Subscription error:', err);
    }

    if (status === 'CHANNEL_ERROR') {
      console.error('[Realtime] Channel connection failed.');
    }

    if (status === 'TIMED_OUT') {
      console.error('[Realtime] Subscription timed out.');
    }

    if (status === 'SUBSCRIBED') {
      console.log(`[Realtime] Successfully subscribed: ${tables.join(', ')}`);
    }
  });

  return () => {
    console.log(`[Realtime] Removing channel: ${channelName}`);
    void supabase.removeChannel(channel);
  };
}
