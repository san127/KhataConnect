import React, { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { SecondaryButton } from '../../components/common/Buttons';
import { SectionTitle } from '../../components/common/SectionTitle';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/appStore';
import { updateMyProfile } from '../../services/profile/profileService';
import { registerPush, requestNotificationPermission } from '../../services/notification/pushService';

const PREFS: { key: string; label: string; hint: string }[] = [
  { key: 'purchases', label: 'Purchases', hint: 'New bills and acknowledgements' },
  { key: 'payments', label: 'Payments', hint: 'Declared, received or rejected payments' },
  { key: 'connections', label: 'Connections', hint: 'Requests and approvals' },
  { key: 'reminders', label: 'Due-date reminders', hint: 'Due soon and overdue alerts' },
  { key: 'disputes', label: 'Disputes', hint: 'Raised and resolved disputes' },
];

export function SettingsScreen() {
  const { theme } = useTheme();
  const profile = useAppStore(s => s.profile)!;
  const [prefs, setPrefs] = useState<Record<string, boolean>>(profile.notification_prefs ?? {});

  const toggle = async (k: string, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    try { await updateMyProfile(profile.id, { notification_prefs: next }); await useAppStore.getState().loadUserData(); }
    catch { setPrefs(prefs); Alert.alert('Could not save', 'Please try again.'); }
  };
  return (
    <Screen>
      <Header title="Settings" />
      <SectionTitle title="Appearance" />
      <RoundedCard style={{ gap: 12 }}>
        <ThemeToggle />
        <AppText variant="caption" color="secondary">"System" follows your phone's light or dark setting.</AppText>
      </RoundedCard>
      <SectionTitle title="Notifications" />
      <RoundedCard style={{ gap: 6 }}>
        {PREFS.map(p => (
          <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="label">{p.label}</AppText>
              <AppText variant="caption" color="secondary">{p.hint}</AppText>
            </View>
            <Switch value={prefs[p.key] !== false} onValueChange={v => toggle(p.key, v)}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }} thumbColor={theme.colors.card} />
          </View>
        ))}
      </RoundedCard>
      <SecondaryButton title="Enable push notifications on this phone" onPress={async () => {
        const ok = await requestNotificationPermission();
        if (!ok) { Alert.alert('Notifications are off', 'Turn them on for KhataConnect in your phone settings.'); return; }
        await registerPush(profile.id);
        Alert.alert('Done', 'Push notifications are enabled.');
      }} />
    </Screen>
  );
}
