import React from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';

export function ProfileAvatar({ uri, name, size = 48 }: { uri?: string | null; name?: string | null; size?: number }) {
  const { theme } = useTheme();
  const initials = (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?';
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.mint }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ fontSize: size * 0.38, fontWeight: '600', color: theme.mode === 'dark' ? theme.colors.text : theme.colors.primary }}>{initials}</AppText>
    </View>
  );
}
