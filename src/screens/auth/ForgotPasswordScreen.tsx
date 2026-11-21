import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthLayout } from './AuthLayout';
import { AppInput } from '../../components/common/AppInput';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { AppText } from '../../components/common/AppText';
import { isEmail, normalizePhone } from '../../utils/validation';
import { sendEmailReset, sendPhoneRecoveryOtp } from '../../services/auth/authService';
import { friendlyError } from '../../utils/errors';

export function ForgotPasswordScreen() {
  const nav = useNavigation<any>();
  const [id, setId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    const v = id.trim();
    if (!isEmail(v) && !normalizePhone(v)) { setErr('Enter a valid email or 10-digit mobile number'); return; }
    setBusy(true);
    try {
      if (isEmail(v)) {
        await sendEmailReset(v);
        Alert.alert('Check your email', 'If an account exists, a reset link is on its way. Open it on this phone.');
        nav.navigate('Login');
      } else {
        const phone = await sendPhoneRecoveryOtp(v);
        nav.navigate('VerifyOTP', { identifier: phone, kind: 'recovery' });
      }
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <AuthLayout title="Forgot password?" subtitle="We'll send a reset link to your email, or a code to your phone.">
      <AppInput label="Email or phone number" value={id} onChangeText={setId} autoCapitalize="none" keyboardType="email-address" error={err ?? undefined} />
      <PrimaryButton title="Continue" onPress={submit} loading={busy} />
      <SecondaryButton title="Back to login" onPress={() => nav.goBack()} />
      <AppText variant="caption" color="secondary" style={{ textAlign: 'center' }}>Phone recovery needs an SMS provider configured in Supabase.</AppText>
    </AuthLayout>
  );
}
