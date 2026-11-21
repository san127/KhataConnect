import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { unreadCount } from '../services/notification/notificationService';
import { useRealtime } from './useRealtime';

export function useUnread(): number {
  const uid = useAppStore(s => s.session?.user.id);
  const [n, setN] = useState(0);
  const load = useCallback(() => { if (uid) unreadCount(uid).then(setN).catch(() => {}); }, [uid]);
  useEffect(load, [load]);
  useRealtime('unread-' + uid, ['notifications'], load, uid);
  return n;
}
