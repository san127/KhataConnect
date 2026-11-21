import React from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';

export function Header({ title, subtitle, back = true, right }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode }) {
  const nav = useNavigation();
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {back && nav.canGoBack() ? (
        <Pressable accessibilityLabel="Go back" onPress={() => nav.goBack()} hitSlop={10}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', ...theme.shadow }}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="title" style={{ fontSize: theme.font.size.xl }} numberOfLines={1}>{title}</AppText>
        {subtitle ? <AppText variant="caption" color="secondary">{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}
