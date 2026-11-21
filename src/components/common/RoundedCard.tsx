import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';

type Props = { children: React.ReactNode; onPress?: () => void; style?: ViewStyle; tone?: 'card' | 'mint' | 'beige' };
export function RoundedCard({ children, onPress, style, tone = 'card' }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const bg = tone === 'mint' ? c.mint : tone === 'beige' ? (theme.mode === 'dark' ? c.mint : c.beige) : c.card;
  const base: ViewStyle = { backgroundColor: bg, borderRadius: theme.radius.xl, padding: theme.spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, ...theme.shadow };
  if (onPress) return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>{children}</Pressable>;
  return <View style={[base, style]}>{children}</View>;
}
