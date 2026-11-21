import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';
export function AppText({ variant = 'body', color, style, ...p }: TextProps & { variant?: Variant; color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'brown' | 'onPrimary' }) {
  const { theme } = useTheme();
  const { size, weight } = theme.font;
  const v: Record<Variant, TextStyle> = {
    display: { fontSize: size.display, fontWeight: weight.semibold },
    title: { fontSize: size.xxl, fontWeight: weight.semibold },
    heading: { fontSize: size.lg, fontWeight: weight.semibold },
    body: { fontSize: size.md, fontWeight: weight.regular },
    label: { fontSize: size.sm, fontWeight: weight.medium },
    caption: { fontSize: size.xs, fontWeight: weight.regular },
  };
  const colors = {
    primary: theme.colors.primary, secondary: theme.colors.textSecondary, error: theme.colors.error,
    success: theme.colors.success, warning: theme.colors.warning, brown: theme.colors.brown, onPrimary: theme.colors.onPrimary,
  };
  return <Text {...p} style={[{ color: color ? colors[color] : theme.colors.text }, v[variant], style]} />;
}
