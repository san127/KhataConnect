import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';
import { SecondaryButton } from './Buttons';

export function LoadingIndicator({ label }: { label?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {label ? <AppText color="secondary">{label}</AppText> : null}
    </View>
  );
}
export function EmptyState({ icon, title, message, action }: { icon?: React.ReactNode; title: string; message?: string; action?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <AppText variant="heading" style={{ textAlign: 'center' }}>{title}</AppText>
      {message ? <AppText color="secondary" style={{ textAlign: 'center' }}>{message}</AppText> : null}
      {action}
    </View>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 12 }}>
      <AlertCircle size={36} color={theme.colors.error} />
      <AppText style={{ textAlign: 'center' }}>{message}</AppText>
      {onRetry ? <SecondaryButton title="Try again" onPress={onRetry} /> : null}
    </View>
  );
}
