import React from 'react';
import { Pressable, View } from 'react-native';
import { Moon, Smartphone, Sun } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import type { ThemePreference } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

const OPTIONS: { key: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { key: 'light', label: 'Light', Icon: Sun }, { key: 'dark', label: 'Dark', Icon: Moon }, { key: 'system', label: 'System', Icon: Smartphone },
];
export function ThemeToggle() {
  const { theme, preference, setPreference } = useTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.mint, borderRadius: theme.radius.lg, padding: 4, gap: 4 }}>
      {OPTIONS.map(({ key, label, Icon }) => {
        const on = preference === key;
        return (
          <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setPreference(key)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: theme.radius.md, gap: 4, backgroundColor: on ? c.card : 'transparent', ...(on ? theme.shadow : {}) }}>
            <Icon size={20} color={on ? c.primary : c.textSecondary} />
            <AppText variant="caption" style={{ color: on ? c.text : c.textSecondary, fontWeight: '600' }}>{label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
