import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';

export type Tone = 'success' | 'warning' | 'error' | 'neutral';
export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const fg = tone === 'success' ? c.success : tone === 'warning' ? c.warning : tone === 'error' ? c.error : c.textSecondary;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: fg + '22', paddingHorizontal: 12, paddingVertical: 4, borderRadius: theme.radius.pill }}>
      <AppText variant="caption" style={{ color: fg, fontWeight: '600' }}>{label}</AppText>
    </View>
  );
}
