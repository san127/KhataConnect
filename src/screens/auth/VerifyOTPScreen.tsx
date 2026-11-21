import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthLayout } from './AuthLayout';
import { AppInput } from '../../components/common/AppInput';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { otpSchema } from '../../utils/validation';
import { resendOtp, verifyOtp, verifyRecoveryOtp } from '../../services/auth/authService';
import { friendlyError } from '../../utils/errors';
import { useAppStore } from '../../store/appStore';

export function VerifyOTPScreen() {
  const nav = useNavigation<any>();
  const { identifier, kind } = useRoute<any>().params as { identifier: string; kind: 'signup' | 'recovery' | 'phone_change' };
  const [token, setToken] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);

  const submit = async () => {
    const p = otpSchema.safeParse({ token });
    if (!p.success) { setErr(p.error.issues[0].message); return; }
    setErr(null); setBusy(true);
    try {
      if (kind === 'recovery') {
        await verifyRecoveryOtp(identifier, token);
        useAppStore.getState().setRecoveryMode(true); // shows ResetPassword; no password change before OTP is verified
      } else {
        await verifyOtp(identifier, token, kind);
        if (kind === 'phone_change') { Alert.alert('Phone verified', 'You can now log in with your phone number too.'); nav.goBack(); }
      }
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  };
  const resend = async () => {
    try { await resendOtp(identifier, kind); setCooldown(30); Alert.alert('Code sent', `A new code was sent to ${identifier}.`); }
    catch (e) { Alert.alert('Could not resend', friendlyError(e)); }
  };
  return (
    <AuthLayout title="Enter the code" subtitle={`We sent a 6-digit code to ${identifier}.`}>
      <AppInput label="6-digit code" value={token} onChangeText={t => setToken(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad"
        textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} error={err ?? undefined} style={{ letterSpacing: 8, fontSize: 22 }} />
      <PrimaryButton title="Verify" onPress={submit} loading={busy} />
      <SecondaryButton title={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'} onPress={resend} disabled={cooldown > 0} />
    </AuthLayout>
  );
}
