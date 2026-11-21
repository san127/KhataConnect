import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';

export function Chips<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.pill, backgroundColor: on ? c.primary : c.mint }}>
            <AppText variant="label" style={{ color: on ? c.onPrimary : c.text }}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
