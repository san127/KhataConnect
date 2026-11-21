import React from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';
import { useUnread } from '../../hooks/useUnread';
import { AppText } from './AppText';

export function NotificationBell() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const n = useUnread();
  return (
    <Pressable accessibilityLabel="Notifications" onPress={() => nav.navigate('Notifications')} hitSlop={8}
      style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', ...theme.shadow }}>
      <Bell size={22} color={theme.colors.text} />
      {n > 0 ? <View style={{ position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: theme.colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
        <AppText variant="caption" style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{n > 9 ? '9+' : n}</AppText></View> : null}
    </Pressable>
  );
}
