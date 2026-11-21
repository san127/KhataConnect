import React from 'react';
import { View } from 'react-native';
import { AppText } from '../common/AppText';
import { useTheme } from '../../theme/useTheme';

export function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'warning' | 'error' }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: '45%', backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 16, gap: 4, borderWidth: 1, borderColor: theme.colors.border }}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText variant="heading" color={tone}>{value}</AppText>
    </View>
  );
}
