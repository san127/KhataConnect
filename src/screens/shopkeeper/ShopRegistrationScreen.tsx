import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { AppInput } from '../../components/common/AppInput';
import { AppText } from '../../components/common/AppText';
import { PrimaryButton } from '../../components/common/Buttons';
import { Chips } from '../../components/common/Chips';
import { ImagePickerField } from '../../components/shop/ImagePickerField';
import { shopSchema } from '../../utils/validation';
import { SHOP_CATEGORIES } from '../../constants/categories';
import { createShop, uploadShopImage } from '../../services/shop/shopService';
import { useAppStore } from '../../store/appStore';
import { friendlyError } from '../../utils/errors';
import { normalizePhone } from '../../utils/validation';

type Form = z.infer<typeof shopSchema>;

export function ShopRegistrationScreen() {
  const nav = useNavigation<any>();
  const profile = useAppStore(s => s.profile);
  const [busy, setBusy] = useState(false);
  const [imgs, setImgs] = useState<{ profile?: string; cover?: string; upi?: string }>({});
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(shopSchema),
    defaultValues: { shop_name: '', owner_name: profile?.full_name ?? '', contact_phone: profile?.phone?.replace('+91', '') ?? '', category: '', address: '', description: '' },
  });

  const submit = handleSubmit(async v => {
    setBusy(true);
    try {
      const shop = await createShop({ ...v, contact_phone: normalizePhone(v.contact_phone)! });
      const failed: string[] = [];
      for (const slot of ['profile', 'cover', 'upi'] as const) {
        if (imgs[slot]) { try { await uploadShopImage(shop.id, slot, imgs[slot]!); } catch { failed.push(slot); } }
      }
      await useAppStore.getState().refreshShops();
      useAppStore.getState().selectShop(shop.id);
      useAppStore.getState().setMode('SHOPKEEPER');
      if (failed.length) Alert.alert('Shop created', `Some photos couldn't upload (${failed.join(', ')}). You can add them later from Edit shop profile.`);
      nav.replace('ShopQR');
    } catch (e) { Alert.alert('Could not register shop', friendlyError(e)); } finally { setBusy(false); }
  });

  const field = (name: keyof Form, label: string, extra: object = {}) => (
    <Controller control={control} name={name} render={({ field }) => <AppInput label={label} value={field.value ?? ''} onChangeText={field.onChange} error={errors[name]?.message as string | undefined} {...extra} />} />
  );
  return (
    <Screen>
      <Header title="Register your shop" />
      {field('shop_name', 'Shop name', { autoCapitalize: 'words' })}
      {field('owner_name', 'Owner name', { autoCapitalize: 'words' })}
      {field('contact_phone', 'Contact phone', { keyboardType: 'phone-pad' })}
      <Controller control={control} name="category" render={({ field }) => (
        <View style={{ gap: 8 }}>
          <AppText variant="label" color="secondary">Category</AppText>
          <Chips value={field.value} onChange={field.onChange} options={SHOP_CATEGORIES.map(c => ({ key: c, label: c }))} />
          {errors.category ? <AppText variant="caption" color="error">{errors.category.message}</AppText> : null}
        </View>
      )} />
      {field('address', 'Shop address', { multiline: true })}
      {field('description', 'About your shop (optional)', { multiline: true })}
      <AppText variant="heading">Photos (optional)</AppText>
      <ImagePickerField label="Shop picture" currentUrl={imgs.profile} onUpload={async u => setImgs(s => ({ ...s, profile: u }))} onRemove={async () => setImgs(s => ({ ...s, profile: undefined }))} />
      <ImagePickerField label="Cover picture" shape="wide" currentUrl={imgs.cover} onUpload={async u => setImgs(s => ({ ...s, cover: u }))} onRemove={async () => setImgs(s => ({ ...s, cover: undefined }))} />
      <ImagePickerField label="UPI QR code" hint="Customers scan this to pay you in their UPI app. Not shown publicly." currentUrl={imgs.upi} onUpload={async u => setImgs(s => ({ ...s, upi: u }))} onRemove={async () => setImgs(s => ({ ...s, upi: undefined }))} />
      <PrimaryButton title="Create shop" onPress={submit} loading={busy} />
    </Screen>
  );
}
