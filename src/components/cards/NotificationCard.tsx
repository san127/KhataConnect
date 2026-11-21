import React from 'react';
import { View } from 'react-native';
import { Bell, CheckCircle2, CreditCard, Link2, ShoppingBag, AlertTriangle } from 'lucide-react-native';
import { RoundedCard } from '../common/RoundedCard';
import { AppText } from '../common/AppText';
import { useTheme } from '../../theme/useTheme';
import { fmtDateTime } from '../../utils/dates';
import type { AppNotification } from '../../types/models';

export function NotificationCard({ n, onPress }: { n: AppNotification; onPress: () => void }) {
  const { theme } = useTheme();
  const t = n.notification_type;
  const Icon = t.startsWith('CONNECTION') ? Link2 : t.startsWith('PURCHASE') ? ShoppingBag : t === 'PAYMENT_RECEIVED' ? CheckCircle2
    : t.startsWith('PAYMENT_OVERDUE') || t.startsWith('DISPUTE') ? AlertTriangle : t.startsWith('PAYMENT') ? CreditCard : Bell;
  return (
    <RoundedCard onPress={onPress} style={{ backgroundColor: n.is_read ? theme.colors.card : theme.colors.mint }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={theme.mode === 'dark' ? theme.colors.text : theme.colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="label" style={{ fontWeight: n.is_read ? '500' : '700' }}>{n.title}</AppText>
          <AppText variant="body" color="secondary" style={{ fontSize: 14 }}>{n.message}</AppText>
          <AppText variant="caption" color="secondary">{fmtDateTime(n.created_at)}</AppText>
        </View>
        {!n.is_read ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary, marginTop: 6 }} /> : null}
      </View>
    </RoundedCard>
  );
}
