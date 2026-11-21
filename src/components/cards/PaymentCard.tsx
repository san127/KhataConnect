import React from 'react';
import { View } from 'react-native';
import { Banknote, QrCode } from 'lucide-react-native';
import { RoundedCard } from '../common/RoundedCard';
import { AppText } from '../common/AppText';
import { AmountDisplay } from '../common/AmountDisplay';
import { StatusBadge, Tone } from '../common/StatusBadge';
import { useTheme } from '../../theme/useTheme';
import { fmtDateTime } from '../../utils/dates';
import type { Payment } from '../../types/models';

export function PaymentCard({ p, who, onPress }: { p: Payment; who: 'shop' | 'customer'; onPress?: () => void }) {
  const { theme } = useTheme();
  const tone: Tone = p.verification_status === 'RECEIVED' ? 'success' : p.verification_status === 'REJECTED' ? 'error' : 'warning';
  const label = p.verification_status === 'RECEIVED' ? 'Received' : p.verification_status === 'REJECTED' ? 'Rejected' : 'Awaiting verification';
  const Icon = p.payment_method === 'UPI' ? QrCode : Banknote;
  return (
    <RoundedCard onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" numberOfLines={1}>{who === 'shop' ? p.profiles?.full_name : p.shops?.shop_name}</AppText>
          <AppText variant="caption" color="secondary">{p.payment_method} · {p.payment_type === 'INDIVIDUAL' ? 'One bill' : 'Overall'} · {fmtDateTime(p.declared_at)}</AppText>
        </View>
        <AmountDisplay amount={p.amount} size="heading" />
      </View>
      <View style={{ marginTop: 10 }}><StatusBadge label={label} tone={tone} /></View>
      {p.rejection_reason ? <AppText variant="caption" color="error" style={{ marginTop: 6 }}>Reason: {p.rejection_reason}</AppText> : null}
    </RoundedCard>
  );
}
