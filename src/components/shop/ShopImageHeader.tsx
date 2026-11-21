import React from 'react';
import { Image, View } from 'react-native';
import { Store } from 'lucide-react-native';
import { AppText } from '../common/AppText';
import { useTheme } from '../../theme/useTheme';

export function ShopImageHeader({ cover, logo, name, subtitle }: { cover?: string | null; logo?: string | null; name: string; subtitle?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ borderRadius: theme.radius.xl, overflow: 'hidden', backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}>
      {cover ? <Image source={{ uri: cover }} style={{ height: 130, width: '100%' }} /> : <View style={{ height: 90, backgroundColor: theme.colors.secondary }} />}
      <View style={{ padding: 16, paddingTop: 0, marginTop: -30, flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
        {logo ? <Image source={{ uri: logo }} style={{ width: 68, height: 68, borderRadius: 22, borderWidth: 3, borderColor: theme.colors.card, backgroundColor: theme.colors.mint }} />
          : <View style={{ width: 68, height: 68, borderRadius: 22, borderWidth: 3, borderColor: theme.colors.card, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center' }}><Store size={30} color={theme.colors.primary} /></View>}
        <View style={{ flex: 1, paddingTop: 34 }}>
          <AppText variant="heading" numberOfLines={1}>{name}</AppText>
          {subtitle ? <AppText variant="caption" color="secondary">{subtitle}</AppText> : null}
        </View>
      </View>
    </View>
  );
}
