import React from 'react';
import { View } from 'react-native';
import { RoundedCard } from '../common/RoundedCard';
import { AppText } from '../common/AppText';
import { AmountDisplay } from '../common/AmountDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { fmtDate } from '../../utils/dates';
import type { CustomerSummary } from '../../types/models';

export function CustomerCard({ c, onPress }: { c: CustomerSummary; onPress: () => void }) {
  return (
    <RoundedCard onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <ProfileAvatar name={c.full_name} size={50} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" numberOfLines={1}>{c.full_name}</AppText>
          <AppText variant="caption" color="secondary">{c.phone ?? 'No phone'} · Last: {fmtDate(c.last_purchase)}</AppText>
        </View>
        <AmountDisplay amount={c.outstanding} size="heading" color={c.outstanding > 0 ? 'warning' : 'success'} />
      </View>
      {c.pending_declarations > 0 || c.overdue_count > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {c.pending_declarations > 0 ? <StatusBadge label={`${c.pending_declarations} to verify`} tone="warning" /> : null}
          {c.overdue_count > 0 ? <StatusBadge label={`${c.overdue_count} overdue`} tone="error" /> : null}
        </View>
      ) : null}
    </RoundedCard>
  );
}
