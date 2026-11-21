// import React, { useState } from 'react';
// import { Alert, View } from 'react-native';
// import { Screen } from '../../components/common/Screen';
// import { Header } from '../../components/common/Header';
// import { AppInput } from '../../components/common/AppInput';
// import { AppText } from '../../components/common/AppText';
// import { PrimaryButton } from '../../components/common/Buttons';
// import { Chips } from '../../components/common/Chips';
// import { ImagePickerField } from '../../components/shop/ImagePickerField';
// import { useAppStore } from '../../store/appStore';
// import { SHOP_CATEGORIES } from '../../constants/categories';
// import { removeShopImage, signedUpiUrl, updateShop, uploadShopImage } from '../../services/shop/shopService';
// import { friendlyError } from '../../utils/errors';
// import { useLoad } from '../../hooks/useLoad';

// /** Edit details and manage the three images. Only the shop owner passes storage/RLS checks. */
// export function ShopProfileEditScreen() {
//   const shop = useAppStore(s => s.selectedShop())!;
//   const refresh = () => useAppStore.getState().refreshShops();
//   const [f, setF] = useState({ shop_name: shop.shop_name, owner_name: shop.owner_name ?? '', contact_phone: shop.contact_phone ?? '', category: shop.category ?? '', address: shop.address ?? '', description: shop.description ?? '' });
//   const [busy, setBusy] = useState(false);
//   const { data: upiUrl } = useLoad(() => signedUpiUrl(shop.upi_qr_url), [shop.upi_qr_url]);

//   const save = async () => {
//     if (f.shop_name.trim().length < 2) { Alert.alert('Shop name is required'); return; }
//     setBusy(true);
//     try { await updateShop(shop.id, f); await refresh(); Alert.alert('Saved'); } catch (e) { Alert.alert('Could not save', friendlyError(e)); } finally { setBusy(false); }
//   };
//   const input = (k: keyof typeof f, label: string, extra: object = {}) => <AppInput label={label} value={f[k]} onChangeText={t => setF(s => ({ ...s, [k]: t }))} {...extra} />;
//   return (
//     <Screen>
//       <Header title="Edit shop" subtitle={shop.shop_code} />
//       {input('shop_name', 'Shop name')}{input('owner_name', 'Owner name')}{input('contact_phone', 'Contact phone', { keyboardType: 'phone-pad' })}
//       <View style={{ gap: 8 }}><AppText variant="label" color="secondary">Category</AppText>
//         <Chips value={f.category} onChange={c => setF(s => ({ ...s, category: c }))} options={SHOP_CATEGORIES.map(c => ({ key: c, label: c }))} /></View>
//       {input('address', 'Address', { multiline: true })}{input('description', 'Description', { multiline: true })}
//       <PrimaryButton title="Save details" onPress={save} loading={busy} />

//       <AppText variant="heading">Photos</AppText>
//       <ImagePickerField label="Shop picture" currentUrl={shop.profile_image_url} onUpload={async u => { await uploadShopImage(shop.id, 'profile', u); await refresh(); }} onRemove={async () => { await removeShopImage(shop.id, 'profile', shop.profile_image_url); await refresh(); }} />
//       <ImagePickerField label="Cover picture" shape="wide" currentUrl={shop.cover_image_url} onUpload={async u => { await uploadShopImage(shop.id, 'cover', u); await refresh(); }} onRemove={async () => { await removeShopImage(shop.id, 'cover', shop.cover_image_url); await refresh(); }} />
//       <ImagePickerField label="UPI QR code" hint="Shown only to your connected customers when they pay by UPI." currentUrl={upiUrl} onUpload={async u => { await uploadShopImage(shop.id, 'upi', u); await refresh(); }} onRemove={async () => { await removeShopImage(shop.id, 'upi', shop.upi_qr_url); await refresh(); }} />
//     </Screen>
//   );
// }



import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { AppInput } from '../../components/common/AppInput';
import { AppText } from '../../components/common/AppText';
import { PrimaryButton } from '../../components/common/Buttons';
import { Chips } from '../../components/common/Chips';
import { ImagePickerField } from '../../components/shop/ImagePickerField';

import { useAppStore } from '../../store/appStore';
import { SHOP_CATEGORIES } from '../../constants/categories';

import {
  removeShopImage,
  signedUpiUrl,
  updateShop,
  uploadShopImage,
} from '../../services/shop/shopService';

import { friendlyError } from '../../utils/errors';
import { useLoad } from '../../hooks/useLoad';

/** Edit shop details, payment details and manage shop images. */
export function ShopProfileEditScreen() {
  const shop = useAppStore(s => s.selectedShop())!;

  const refresh = () =>
    useAppStore.getState().refreshShops();

  const [f, setF] = useState({
    shop_name: shop.shop_name,
    owner_name: shop.owner_name ?? '',
    contact_phone: shop.contact_phone ?? '',
    category: shop.category ?? '',
    address: shop.address ?? '',
    description: shop.description ?? '',

    // Payment details
    upi_id: shop.upi_id ?? '',
    payment_phone: shop.payment_phone ?? '',
  });

  const [busy, setBusy] = useState(false);

  const { data: upiUrl } = useLoad(
    () => signedUpiUrl(shop.upi_qr_url),
    [shop.upi_qr_url]
  );

  const save = async () => {
    if (f.shop_name.trim().length < 2) {
      Alert.alert('Invalid shop name', 'Shop name must contain at least 2 characters.');
      return;
    }

    // Validate UPI ID if provided
    const upi = f.upi_id.trim();

    const upiRegex =
      /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/;

    if (upi && !upiRegex.test(upi)) {
      Alert.alert(
        'Invalid UPI ID',
        'Please enter a valid UPI ID, for example name@okaxis.'
      );
      return;
    }

    // Validate payment phone if provided
    const phone = f.payment_phone.trim();

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert(
        'Invalid payment phone',
        'Enter a valid 10-digit Indian mobile number.'
      );
      return;
    }

    setBusy(true);

    try {
      await updateShop(shop.id, {
        ...f,
        shop_name: f.shop_name.trim(),
        owner_name: f.owner_name.trim() || null,
        contact_phone: f.contact_phone.trim() || null,
        category: f.category || null,
        address: f.address.trim() || null,
        description: f.description.trim() || null,
        upi_id: upi || null,
        payment_phone: phone || null,
      });

      await refresh();

      Alert.alert('Saved', 'Shop and payment details updated successfully.');
    } catch (e) {
      Alert.alert('Could not save', friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const input = (
    k: keyof typeof f,
    label: string,
    extra: object = {}
  ) => (
    <AppInput
      label={label}
      value={f[k]}
      onChangeText={t =>
        setF(s => ({ ...s, [k]: t }))
      }
      {...extra}
    />
  );

  return (
    <Screen>
      <Header
        title="Edit shop"
        subtitle={shop.shop_code}
      />

      {/* SHOP DETAILS */}

      <AppText variant="heading">
        Shop information
      </AppText>

      {input('shop_name', 'Shop name')}

      {input('owner_name', 'Owner name')}

      {input('contact_phone', 'Contact phone', {
        keyboardType: 'phone-pad',
      })}

      <View style={{ gap: 8 }}>
        <AppText variant="label" color="secondary">
          Category
        </AppText>

        <Chips
          value={f.category}
          onChange={c =>
            setF(s => ({ ...s, category: c }))
          }
          options={SHOP_CATEGORIES.map(c => ({
            key: c,
            label: c,
          }))}
        />
      </View>

      {input('address', 'Address', {
        multiline: true,
      })}

      {input('description', 'Description', {
        multiline: true,
      })}

      {/* PAYMENT DETAILS */}

      <View style={{ gap: 8, marginTop: 12 }}>
        <AppText variant="heading">
          Payment details
        </AppText>

        <AppText color="secondary" variant="caption">
          Add your UPI ID and payment phone number.
          Customers can copy these details when paying your shop.
        </AppText>
      </View>

      {input('upi_id', 'UPI ID', {
        autoCapitalize: 'none',
        placeholder: 'yourname@okaxis',
      })}

      {input('payment_phone', 'Payment phone number', {
        keyboardType: 'phone-pad',
        maxLength: 10,
        placeholder: '10-digit mobile number',
      })}

      <AppText color="secondary" variant="caption">
        Both payment details are optional. Leave them empty if you
        only want to accept QR-based payments.
      </AppText>

      <PrimaryButton
        title="Save shop & payment details"
        onPress={save}
        loading={busy}
      />

      {/* SHOP PHOTOS */}

      <AppText variant="heading">
        Photos
      </AppText>

      <ImagePickerField
        label="Shop picture"
        currentUrl={shop.profile_image_url}
        onUpload={async u => {
          await uploadShopImage(shop.id, 'profile', u);
          await refresh();
        }}
        onRemove={async () => {
          await removeShopImage(
            shop.id,
            'profile',
            shop.profile_image_url
          );
          await refresh();
        }}
      />

      <ImagePickerField
        label="Cover picture"
        shape="wide"
        currentUrl={shop.cover_image_url}
        onUpload={async u => {
          await uploadShopImage(shop.id, 'cover', u);
          await refresh();
        }}
        onRemove={async () => {
          await removeShopImage(
            shop.id,
            'cover',
            shop.cover_image_url
          );
          await refresh();
        }}
      />

      <ImagePickerField
        label="UPI QR code"
        hint="Shown only to your connected customers when they pay by UPI."
        currentUrl={upiUrl}
        onUpload={async u => {
          await uploadShopImage(shop.id, 'upi', u);
          await refresh();
        }}
        onRemove={async () => {
          await removeShopImage(
            shop.id,
            'upi',
            shop.upi_qr_url
          );
          await refresh();
        }}
      />
    </Screen>
  );
}
