import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';
import { haptic } from '../../hooks/useHaptic';

type Props = {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; icon?: React.ReactNode;
  style?: ViewStyle; tone?: 'default' | 'danger';
};

function Base({ title, onPress, loading, disabled, icon, style, tone = 'default', variant }: Props & { variant: 'primary' | 'secondary' }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const danger = tone === 'danger';
  const bg = variant === 'primary' ? (danger ? c.error : c.primary) : c.mint;
  const fg = variant === 'primary' ? c.onPrimary : danger ? c.error : c.text;
  const off = disabled || loading;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!off }} disabled={off}
      onPress={() => { haptic(); onPress(); }}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, borderRadius: theme.radius.md, minHeight: theme.touch, opacity: off ? 0.55 : pressed ? 0.88 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: danger ? c.error : c.secondary }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={styles.row}>{icon}<AppText variant="heading" style={{ color: fg, fontSize: theme.font.size.md }}>{title}</AppText></View>
      )}
    </Pressable>
  );
}
export const PrimaryButton = (p: Props) => <Base {...p} variant="primary" />;
export const SecondaryButton = (p: Props) => <Base {...p} variant="secondary" />;
const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
