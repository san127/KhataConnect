import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Store } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { EmptyState } from '../../components/common/States';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { View } from 'react-native';

/** Shown in shopkeeper mode when the account has no shop yet. */
export function ShopOnboarding() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  return (
    <Screen>
      <EmptyState icon={<Store size={32} color={theme.colors.primary} />} title="Set up your shop" message="Register your shop to add customers, record udhaar and verify payments."
        action={<View style={{ width: '100%', gap: 10, marginTop: 8 }}>
          <PrimaryButton title="Register shop" onPress={() => nav.navigate('ShopRegistration')} />
          <SecondaryButton title="Back to customer view" onPress={() => useAppStore.getState().setMode('CUSTOMER')} />
        </View>} />
    </Screen>
  );
}
