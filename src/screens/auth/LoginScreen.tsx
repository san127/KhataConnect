import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from './AuthLayout';
import { AppInput } from '../../components/common/AppInput';
import { PrimaryButton } from '../../components/common/Buttons';
import { AppText } from '../../components/common/AppText';
import { loginSchema } from '../../utils/validation';
import { login } from '../../services/auth/authService';
import { friendlyError } from '../../utils/errors';
import { isConfigured } from '../../config/env';

type Form = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const nav = useNavigation<any>();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } });

  const submit = handleSubmit(async v => {
    setErr(null); setBusy(true);
    try { await login(v.identifier, v.password); } // RootNavigator reacts to the new session
    catch (e) { setErr(friendlyError(e)); }
    finally { setBusy(false); }
  });

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to see your khata.">
      {!isConfigured ? <AppText color="warning">Supabase isn't configured yet. Add your keys to .env (see README).</AppText> : null}
      <Controller control={control} name="identifier" render={({ field }) => (
        <AppInput label="Email or phone number" value={field.value} onChangeText={field.onChange} autoCapitalize="none" keyboardType="email-address" error={errors.identifier?.message} />
      )} />
      <Controller control={control} name="password" render={({ field }) => (
        <AppInput label="Password" secure value={field.value} onChangeText={field.onChange} autoCapitalize="none" error={errors.password?.message} onSubmitEditing={() => { submit(); }} />
      )} />
      {err ? <AppText color="error">{err}</AppText> : null}
      <PrimaryButton title="Log in" onPress={submit} loading={busy} />
      <Pressable onPress={() => nav.navigate('ForgotPassword')} style={{ alignSelf: 'center', padding: 8 }}><AppText color="primary" variant="label">Forgot password?</AppText></Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <AppText color="secondary">New here?</AppText>
        <Pressable onPress={() => nav.navigate('Register')}><AppText color="primary" variant="label">Create an account</AppText></Pressable>
      </View>
    </AuthLayout>
  );
}
