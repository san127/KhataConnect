import React from 'react';
import { Image, View } from 'react-native';
import { Store } from 'lucide-react-native';
import { RoundedCard } from '../common/RoundedCard';
import { AppText } from '../common/AppText';
import { AmountDisplay } from '../common/AmountDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { useTheme } from '../../theme/useTheme';
import { fmtDate, isOverdue } from '../../utils/dates';
import type { ShopSummary } from '../../types/models';

export function ShopCard({ shop, onPress }: { shop: ShopSummary; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <RoundedCard onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        {shop.profile_image_url
          ? <Image source={{ uri: shop.profile_image_url }} style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: theme.colors.mint }} />
          : <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center' }}><Store size={26} color={theme.colors.primary} /></View>}
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading" numberOfLines={1}>{shop.shop_name}</AppText>
          <AppText variant="caption" color="secondary">{[shop.category, shop.shop_code].filter(Boolean).join(' · ')}</AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AmountDisplay amount={shop.outstanding} size="heading" color={shop.outstanding > 0 ? undefined : 'success'} />
          <AppText variant="caption" color="secondary">{shop.unpaid_count} unpaid</AppText>
        </View>
      </View>
      {shop.next_due || shop.overdue_count > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {shop.overdue_count > 0 ? <StatusBadge label={`${shop.overdue_count} overdue`} tone="error" /> : null}
          {shop.next_due ? <StatusBadge label={`Next due ${fmtDate(shop.next_due)}`} tone={isOverdue(shop.next_due) ? 'error' : 'neutral'} /> : null}
        </View>
      ) : null}
    </RoundedCard>
  );
}
