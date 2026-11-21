import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from './AuthLayout';
import { AppInput } from '../../components/common/AppInput';
import { PrimaryButton } from '../../components/common/Buttons';
import { AppText } from '../../components/common/AppText';
import { resetSchema } from '../../utils/validation';
import { logout, updatePassword } from '../../services/auth/authService';
import { friendlyError } from '../../utils/errors';
import { useAppStore } from '../../store/appStore';

type Form = z.infer<typeof resetSchema>;

/** Shown after a recovery link / verified recovery OTP. After updating, we sign out and return to Login. */
export function ResetPasswordScreen() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirm: '' } });
  const submit = handleSubmit(async v => {
    setErr(null); setBusy(true);
    try {
      await updatePassword(v.password);
      await logout();
      useAppStore.getState().setRecoveryMode(false);
      Alert.alert('Password updated', 'Please log in with your new password.');
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  });
  return (
    <AuthLayout title="Set a new password" subtitle="Choose something you'll remember.">
      <Controller control={control} name="password" render={({ field }) => <AppInput label="New password" secure value={field.value} onChangeText={field.onChange} autoCapitalize="none" error={errors.password?.message} />} />
      <Controller control={control} name="confirm" render={({ field }) => <AppInput label="Confirm password" secure value={field.value} onChangeText={field.onChange} autoCapitalize="none" error={errors.confirm?.message} />} />
      {err ? <AppText color="error">{err}</AppText> : null}
      <PrimaryButton title="Update password" onPress={submit} loading={busy} />
    </AuthLayout>
  );
}
