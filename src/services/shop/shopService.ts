import { supabase } from '../supabase/client';
import { rpc, unwrap } from '../supabase/rpc';
import type { Shop, ShopPreview } from '../../types/models';
import { pickedImageToBuffer } from './imageUtils';

export type ShopInput = {
  shop_name: string; owner_name: string; contact_phone: string; category: string; address: string; description?: string;
};

export async function listMyShops(uid: string): Promise<Shop[]> {
  return unwrap(await supabase.from('shops').select('*').eq('owner_id', uid).order('created_at'));
}
export const createShop = (i: ShopInput) =>
  rpc<Shop>('create_shop', { p_name: i.shop_name, p_owner_name: i.owner_name, p_phone: i.contact_phone,
    p_category: i.category, p_address: i.address, p_description: i.description ?? null });

export async function updateShop(id: string, patch: Partial<Shop>) {
  unwrap(await supabase.from('shops').update(patch).eq('id', id).select('id').single());
}
export const regenerateShopQr = (shopId: string) => rpc<string>('regenerate_shop_qr', { p_shop_id: shopId });
export const previewShopByCode = (code: string) => rpc<ShopPreview>('get_shop_preview', { p_code: code });
export const previewShopByToken = (token: string) => rpc<ShopPreview>('get_shop_preview', { p_token: token });

export type ImageSlot = 'profile' | 'cover' | 'upi';

/** Compress, upload and save the URL on the shop. UPI QR goes to the private bucket (stored as a path). */
// export async function uploadShopImage(shopId: string, slot: ImageSlot, uri: string): Promise<string> {
//   const { buffer, contentType } = await pickedImageToBuffer(uri, slot === 'cover' ? 1280 : slot === 'upi' ? 1024 : 640, 0.8);
//   const bucket = slot === 'upi' ? 'shop-upi' : 'shop-public';
//   const path = `${shopId}/${slot}-${Date.now()}.jpg`;
//   const { error } = await supabase.storage.from(bucket).upload(path, buffer, { contentType, upsert: true });
//   if (error) throw new Error(`Image upload failed: ${error.message}`);
//   const stored = slot === 'upi' ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
//   await updateShop(shopId, { [slot === 'profile' ? 'profile_image_url' : slot === 'cover' ? 'cover_image_url' : 'upi_qr_url']: stored } as Partial<Shop>);
  
//   return stored;
// }


export async function uploadShopImage(
  shopId: string,
  slot: ImageSlot,
  uri: string
): Promise<string> {
  const { buffer, contentType } = await pickedImageToBuffer(
    uri,
    slot === 'cover' ? 1280 : slot === 'upi' ? 1024 : 640,
    0.8
  );

  const bucket = slot === 'upi' ? 'shop-upi' : 'shop-public';
  const path = `${shopId}/${slot}-${Date.now()}.jpg`;

  console.log('Starting image upload:', { shopId, slot, bucket, path });

  // 1. Upload image to Supabase Storage
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error('STORAGE UPLOAD FAILED:', error);
    throw new Error(`Image upload failed: ${error.message}`);
  }

  console.log('Image uploaded successfully:', path);

  // 2. Get URL or retain private storage path
  const stored =
    slot === 'upi'
      ? path
      : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  // 3. Save image reference in shops table
  try {
    await updateShop(shopId, {
      [slot === 'profile'
        ? 'profile_image_url'
        : slot === 'cover'
        ? 'cover_image_url'
        : 'upi_qr_url']: stored,
    } as Partial<Shop>);

    console.log('Shop image URL saved successfully');
  } catch (e) {
    console.error('SHOP DATABASE UPDATE FAILED:', e);
    throw e;
  }

  return stored;
}


export async function removeShopImage(shopId: string, slot: ImageSlot, current: string | null) {
  if (current) {
    const bucket = slot === 'upi' ? 'shop-upi' : 'shop-public';
    const marker = `/${bucket}/`;
    const path = slot === 'upi' ? current : current.includes(marker) ? current.split(marker)[1] : null;
    if (path) await supabase.storage.from(bucket).remove([path]);
  }
  await updateShop(shopId, { [slot === 'profile' ? 'profile_image_url' : slot === 'cover' ? 'cover_image_url' : 'upi_qr_url']: null } as Partial<Shop>);
}

export async function signedUpiUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('shop-upi').createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export interface ReminderSettings { reminder_enabled: boolean; reminder_days_before: number; reminder_days_after: number }
export async function getReminderSettings(shopId: string): Promise<ReminderSettings> {
  return unwrap(await supabase.from('shop_reminder_settings').select('*').eq('shop_id', shopId).single()) as ReminderSettings;
}
export async function saveReminderSettings(shopId: string, v: { reminder_enabled: boolean; reminder_days_before: number; reminder_days_after: number }) {
  unwrap(await supabase.from('shop_reminder_settings').update(v).eq('shop_id', shopId).select('id').single());
}
