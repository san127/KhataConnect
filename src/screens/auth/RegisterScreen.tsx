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
import { registerSchema } from '../../utils/validation';
import { registerAccount } from '../../services/auth/authService';
import { friendlyError } from '../../utils/errors';

type Form = z.infer<typeof registerSchema>;

export function RegisterScreen() {
  const nav = useNavigation<any>();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(registerSchema), defaultValues: { full_name: '', email: '', phone: '', password: '', confirm: '' },
  });

  const submit = handleSubmit(async v => {
    setErr(null); setBusy(true);
    try {
      const r = await registerAccount({ full_name: v.full_name.trim(), email: v.email, phone: v.phone, password: v.password });
      if (r.kind === 'phone') nav.navigate('VerifyOTP', { identifier: r.identifier, kind: 'signup' });
      else if (r.needsVerification) nav.navigate('EmailVerification', { email: r.identifier });
    } catch (e) { setErr(friendlyError(e)); }
    finally { setBusy(false); }
  });

  const f = (name: keyof Form, label: string, extra: object = {}) => (
    <Controller control={control} name={name} render={({ field }) => (
      <AppInput label={label} value={field.value ?? ''} onChangeText={field.onChange} error={errors[name]?.message as string | undefined} {...extra} />
    )} />
  );
  return (
    <AuthLayout title="Create your account" subtitle="Use an email or a phone number. One account works as customer and shopkeeper.">
      {f('full_name', 'Full name', { autoCapitalize: 'words' })}
      {f('email', 'Email', { autoCapitalize: 'none', keyboardType: 'email-address' })}
      {/* {f('phone', 'Phone number (optional if you add an email)', { keyboardType: 'phone-pad' })} */}
      {f('password', 'Password', { secure: true, autoCapitalize: 'none' })}
      {f('confirm', 'Confirm password', { secure: true, autoCapitalize: 'none' })}
      {err ? <AppText color="error">{err}</AppText> : null}
      <PrimaryButton title="Create account" onPress={submit} loading={busy} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <AppText color="secondary">Already have an account?</AppText>
        <Pressable onPress={() => nav.navigate('Login')}><AppText color="primary" variant="label">Log in</AppText></Pressable>
      </View>
    </AuthLayout>
  );
}
