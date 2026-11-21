import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MailCheck } from 'lucide-react-native';
import { AuthLayout } from './AuthLayout';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { resendOtp } from '../../services/auth/authService';
import { friendlyError } from '../../utils/errors';
import { useTheme } from '../../theme/useTheme';

export function EmailVerificationScreen() {
  const nav = useNavigation<any>();
  const { email } = useRoute<any>().params;
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);
  return (
    <AuthLayout title="Check your inbox" subtitle={`We sent a verification link to ${email}.`}>
      <RoundedCard tone="mint" style={{ alignItems: 'center', gap: 10 }}>
        <MailCheck size={40} color={theme.colors.primary} />
        <AppText style={{ textAlign: 'center' }} color="secondary">Open the link on this phone. It brings you straight back to KhataConnect and signs you in.</AppText>
      </RoundedCard>
      <SecondaryButton title="Resend email" loading={busy} onPress={async () => {
        setBusy(true);
        try { await resendOtp(email, 'signup'); Alert.alert('Sent', 'Verification email sent again.'); }
        catch (e) { Alert.alert('Could not resend', friendlyError(e)); } finally { setBusy(false); }
      }} />
      <PrimaryButton title="Back to login" onPress={() => nav.navigate('Login')} />
    </AuthLayout>
  );
}
