import React from 'react';
import { Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/common/AppText';
import { useTheme } from '../theme/useTheme';
import { haptic } from '../hooks/useHaptic';
import { useUnread } from '../hooks/useUnread';

export type TabIcons = Record<string, React.ComponentType<{ size?: number; color?: string }>>;

/** Rounded floating-style bottom bar that follows the theme. */
export function makeTabBar(icons: TabIcons, labels: Record<string, string>) {
  return function TabBar({ state, navigation }: BottomTabBarProps) {
    const { theme } = useTheme();
    const unread = useUnread();
    return (
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', backgroundColor: theme.colors.card, marginHorizontal: 14, marginBottom: 8, borderRadius: 26, padding: 6, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow }}>
          {state.routes.map((route, i) => {
            const focused = state.index === i;
            const Icon = icons[route.name];
            const color = focused ? theme.colors.primary : theme.colors.textSecondary;
            return (
              <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={labels[route.name]}
                onPress={() => { haptic(); const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!focused && !e.defaultPrevented) navigation.navigate(route.name); }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 8, gap: 3, borderRadius: 20, backgroundColor: focused ? theme.colors.mint : 'transparent' }}>
                <View>
                  <Icon size={22} color={color} />
                  {route.name === 'Notifications' && unread > 0 ? <View style={{ position: 'absolute', top: -2, right: -6, width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.error }} /> : null}
                </View>
                <AppText variant="caption" style={{ color, fontWeight: focused ? '700' : '500', fontSize: 11 }}>{labels[route.name]}</AppText>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    );
  };
}
