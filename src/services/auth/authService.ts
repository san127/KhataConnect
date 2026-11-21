import { Linking } from 'react-native';
import { supabase } from '../supabase/client';
import { env } from '../../config/env';
import { isEmail, normalizePhone } from '../../utils/validation';

export type OtpKind = 'signup' | 'recovery' | 'phone_change';

export async function registerAccount(p: { full_name: string; email?: string; phone?: string; password: string }) {
  const phone = p.phone ? normalizePhone(p.phone) : null;
  const email = p.email?.trim() || null;
  if (email) {
    // Email is the primary identifier; a phone number (if given) is stored on the profile
    // and can be verified later from Profile so phone+password login works too.
    const { data, error } = await supabase.auth.signUp({
      email, password: p.password,
      options: { emailRedirectTo: env.deepLink, data: { full_name: p.full_name, ...(phone ? { phone } : {}) } },
    });
    if (error) throw error;
    return { kind: 'email' as const, needsVerification: !data.session, identifier: email };
  }
  const { error } = await supabase.auth.signUp({
    phone: phone!, password: p.password, options: { data: { full_name: p.full_name } },
  });
  if (error) throw error;
  return { kind: 'phone' as const, needsVerification: true, identifier: phone! };
}

export async function verifyOtp(identifier: string, token: string, kind: OtpKind) {
  const isPhone = !isEmail(identifier);
  const { data, error } = isPhone
    ? await supabase.auth.verifyOtp({ phone: identifier, token, type: kind === 'phone_change' ? 'phone_change' : 'sms' })
    : await supabase.auth.verifyOtp({ email: identifier, token, type: 'signup' });
  if (error) throw error;
  return data;
}

export async function resendOtp(identifier: string, kind: OtpKind) {
  if (kind === 'recovery') return sendPhoneRecoveryOtp(identifier);
  if (isEmail(identifier)) {
    const { error } = await supabase.auth.resend({ type: 'signup', email: identifier, options: { emailRedirectTo: env.deepLink } });
    if (error) throw error;
  } else {
    const { error } = await supabase.auth.resend({ type: kind === 'phone_change' ? 'phone_change' : 'sms', phone: identifier });
    if (error) throw error;
  }
}

export async function login(identifier: string, password: string) {
  const id = identifier.trim();
  const { error } = isEmail(id)
    ? await supabase.auth.signInWithPassword({ email: id, password })
    : await supabase.auth.signInWithPassword({ phone: normalizePhone(id)!, password });
  if (error) throw error;
}

export async function sendEmailReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: env.deepLink });
  if (error) throw error;
}

// Phone recovery: Supabase has no phone "recovery" email-style flow. The supported path is an SMS OTP
// sign-in (existing users only) followed by updateUser({ password }) once the OTP is verified.
export async function sendPhoneRecoveryOtp(phone: string) {
  const e164 = normalizePhone(phone);
  if (!e164) throw new Error('Enter a valid 10-digit mobile number');
  const { error } = await supabase.auth.signInWithOtp({ phone: e164, options: { shouldCreateUser: false } });
  if (error) throw error;
  return e164;
}

export async function verifyRecoveryOtp(phone: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function startPhoneVerification(phone: string) {
  const e164 = normalizePhone(phone);
  if (!e164) throw new Error('Enter a valid 10-digit mobile number');
  const { error } = await supabase.auth.updateUser({ phone: e164 });
  if (error) throw error;
  return e164;
}

export const logout = () => supabase.auth.signOut();

/** Parses khataconnect://auth-callback#access_token=...&type=recovery (implicit flow) or ?code=... (PKCE). */
export async function handleAuthDeepLink(url: string): Promise<'recovery' | 'signup' | 'other' | null> {
  if (!url || !url.startsWith(env.deepLink.split('://')[0] + '://')) return null;
  const q = url.split(/[?#]/).slice(1).join('&');
  const params = new URLSearchParams(q);
  const err = params.get('error_description');
  if (err) throw new Error(decodeURIComponent(err.replace(/\+/g, ' ')));
  const type = params.get('type');
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  const code = params.get('code');
  if (access && refresh) {
    const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    if (error) throw error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else {
    return null;
  }
  return type === 'recovery' ? 'recovery' : type === 'signup' || type === 'email' ? 'signup' : 'other';
}

export const getInitialUrl = () => Linking.getInitialURL();
