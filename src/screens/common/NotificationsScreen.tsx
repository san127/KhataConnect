import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BellOff } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { SecondaryButton } from '../../components/common/Buttons';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { NotificationCard } from '../../components/cards/NotificationCard';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { listNotifications, markAllRead, markRead } from '../../services/notification/notificationService';
import { useTheme } from '../../theme/useTheme';
import type { AppNotification } from '../../types/models';

/** Routes a notification to the most relevant screen for the current mode. */
export function routeForNotification(n: AppNotification, mode: 'CUSTOMER' | 'SHOPKEEPER'): { name: string; params?: object } | null {
  const t = n.notification_type;
  if (!n.related_id) return null;
  if (t.startsWith('PURCHASE') || t === 'PAYMENT_DUE_SOON' || t === 'PAYMENT_OVERDUE') return { name: 'PurchaseDetails', params: { id: n.related_id } };
  if (t === 'PAYMENT_DECLARED') return mode === 'SHOPKEEPER' ? { name: 'PaymentVerification', params: { id: n.related_id } } : { name: 'PaymentDetails', params: { id: n.related_id } };
  if (t.startsWith('PAYMENT')) return { name: 'PaymentDetails', params: { id: n.related_id } };
  if (t === 'CONNECTION_REQUEST') return { name: mode === 'SHOPKEEPER' ? 'ShopConnectionRequests' : 'ConnectionRequests' };
  if (t.startsWith('DISPUTE')) return { name: mode === 'SHOPKEEPER' ? 'ShopDisputes' : 'Disputes' };
  return null;
}

export function NotificationsScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const uid = useAppStore(s => s.session?.user.id)!;
  const mode = useAppStore(s => s.mode);
  const { data, loading, error, refreshing, reload } = useLoad(() => listNotifications(uid), [uid]);
  useRealtime('notif-' + uid, ['notifications'], reload, uid);
  const unread = (data ?? []).filter(n => !n.is_read).length;

  const open = async (n: AppNotification) => {
    if (!n.is_read) { await markRead(n.id); reload(); }
    const r = routeForNotification(n, mode);
    if (r) nav.getParent()?.navigate(r.name, r.params) ?? nav.navigate(r.name, r.params);
  };
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header back={false} title="Notifications" subtitle={unread ? `${unread} unread` : 'All caught up'} />
      {unread > 0 ? <SecondaryButton title="Mark all as read" onPress={async () => { await markAllRead(uid); reload(); }} /> : null}
      {loading ? <LoadingIndicator /> : error ? <ErrorState message={error} onRetry={reload} />
        : !data?.length ? <EmptyState icon={<BellOff size={30} color={theme.colors.primary} />} title="No notifications yet" message="Purchases, payments and reminders will show up here." />
        : <View style={{ gap: 12 }}>{data.map(n => <NotificationCard key={n.id} n={n} onPress={() => open(n)} />)}</View>}
    </Screen>
  );
}
