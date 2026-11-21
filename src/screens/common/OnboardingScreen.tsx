import React from 'react';
import { View } from 'react-native';
import { BookOpenCheck, Handshake, QrCode } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { AppText } from '../../components/common/AppText';
import { PrimaryButton } from '../../components/common/Buttons';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';

export function OnboardingScreen() {
  const { theme } = useTheme();
  const items = [
    { Icon: BookOpenCheck, t: 'Your khata, digital', d: 'Every udhaar bill is itemised and safe — no more notebook arguments.' },
    { Icon: QrCode, t: 'Connect with a scan', d: 'Customers and shops connect with a QR code or a short shop code.' },
    { Icon: Handshake, t: 'Pay your way', d: 'Pay by UPI or cash outside the app. The shop confirms, and balances update.' },
  ];
  return (
    <Screen contentStyle={{ paddingTop: 40 }}>
      <AppText variant="caption" color="brown" style={{ letterSpacing: 2, fontWeight: '700' }}>KHATACONNECT</AppText>
      <AppText variant="display">Udhaar, made simple.</AppText>
      {items.map(({ Icon, t, d }) => (
        <View key={t} style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' }}><Icon size={26} color={theme.mode === 'dark' ? theme.colors.text : theme.colors.primary} /></View>
          <View style={{ flex: 1 }}><AppText variant="heading">{t}</AppText><AppText color="secondary">{d}</AppText></View>
        </View>
      ))}
      <PrimaryButton title="Get started" onPress={() => useAppStore.getState().finishOnboarding()} />
    </Screen>
  );
}
