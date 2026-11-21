import React from 'react';
import { View } from 'react-native';
import { RoundedCard } from '../common/RoundedCard';
import { AppText } from '../common/AppText';
import { AmountDisplay } from '../common/AmountDisplay';
import { StatusBadge, Tone } from '../common/StatusBadge';
import { fmtDate, isOverdue } from '../../utils/dates';
import type { Balance } from '../../types/models';

export function purchaseStatus(b: Balance): { label: string; tone: Tone } {
  if (b.transaction_status === 'VOIDED') return { label: 'Cancelled', tone: 'neutral' };
  if (b.transaction_status === 'DISPUTED') return { label: 'Disputed', tone: 'error' };
  if (b.remaining_amount <= 0) return { label: 'Paid', tone: 'success' };
  if (isOverdue(b.due_date)) return { label: 'Overdue', tone: 'error' };
  if (b.paid_amount > 0) return { label: 'Partly paid', tone: 'warning' };
  return { label: 'Unpaid', tone: 'warning' };
}

export function PurchaseCard({ b, title, onPress }: { b: Balance; title?: string; onPress: () => void }) {
  const s = purchaseStatus(b);
  return (
    <RoundedCard onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" numberOfLines={1}>{title ?? `Bill ${b.transaction_id.slice(0, 8).toUpperCase()}`}</AppText>
          <AppText variant="caption" color="secondary">{fmtDate(b.created_at)}{b.due_date ? ` · Due ${fmtDate(b.due_date)}` : ''}</AppText>
        </View>
        <AmountDisplay amount={b.total_amount} size="heading" />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <StatusBadge label={s.label} tone={s.tone} />
        <AppText variant="caption" color="secondary">Paid {b.paid_amount} · Left {b.remaining_amount}</AppText>
      </View>
      {b.acknowledgement_status === 'AWAITING' && b.transaction_status !== 'VOIDED' ? (
        <AppText variant="caption" color="brown" style={{ marginTop: 8 }}>Awaiting customer acknowledgement</AppText>
      ) : null}
    </RoundedCard>
  );
}
