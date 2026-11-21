import React from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { OfflineBanner } from './OfflineBanner';

type Props = {
  children: React.ReactNode; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void;
  padded?: boolean; contentStyle?: ViewStyle; edges?: ('top' | 'bottom')[];
};

export function Screen({ children, scroll = true, refreshing, onRefresh, padded = true, contentStyle, edges = ['top'] }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const inner = { padding: padded ? theme.spacing.lg : 0, paddingBottom: theme.spacing.xxl * 2, gap: theme.spacing.lg };
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={edges}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      <OfflineBanner />
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[inner, contentStyle]}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}>
          {children}
        </ScrollView>
      ) : <View style={[styles.flex, inner, contentStyle]}>{children}</View>}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ flex: { flex: 1 } });
