import { supabase } from '../supabase/client';
import { rpc, unwrap } from '../supabase/rpc';
import type { Profile } from '../../types/models';
import { pickedImageToBuffer } from '../shop/imageUtils';

export async function getMyProfile(uid: string): Promise<Profile> {
  return unwrap(await supabase.from('profiles').select('*').eq('id', uid).single());
}
export async function updateMyProfile(uid: string, patch: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'notification_prefs'>>) {
  unwrap(await supabase.from('profiles').update(patch).eq('id', uid).select('id').single());
}
export async function getMyQrToken(uid: string): Promise<string | null> {
  const { data } = await supabase.from('customer_qr_tokens').select('token').eq('user_id', uid).eq('is_active', true).maybeSingle();
  return data?.token ?? null;
}
export const regenerateMyQr = () => rpc<string>('regenerate_customer_qr');
export const revokeMyQr = () => rpc<void>('revoke_customer_qr');

export async function uploadAvatar(uid: string, uri: string): Promise<string> {
  const { buffer, contentType } = await pickedImageToBuffer(uri, 512, 0.8);
  const path = `${uid}/avatar-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;
  const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  await updateMyProfile(uid, { avatar_url: url });
  return url;
}
