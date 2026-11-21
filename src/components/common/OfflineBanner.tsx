import React from 'react';
import { Text, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useOnline } from '../../hooks/useNetwork';
import { useTheme } from '../../theme/useTheme';

export function OfflineBanner() {
  const online = useOnline();
  const { theme } = useTheme();
  if (online) return null;
  return (
    <View style={{ backgroundColor: theme.colors.warning, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <WifiOff size={16} color={theme.colors.onPrimary} />
      <Text style={{ color: theme.colors.onPrimary, fontSize: theme.font.size.sm, fontWeight: theme.font.weight.medium }}>
        You're offline. Showing what was loaded; changes need internet.
      </Text>
    </View>
  );
}
