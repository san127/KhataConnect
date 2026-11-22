import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Bell, ChevronRight, LogOut, Palette, QrCode, Repeat, Store, Phone, ShieldAlert, FileBarChart, AlarmClock, Pencil } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { logout, startPhoneVerification } from '../../services/auth/authService';
import { unregisterPush } from '../../services/notification/pushService';
import { uploadAvatar } from '../../services/profile/profileService';
import { friendlyError } from '../../utils/errors';
import { Chips } from '../../components/common/Chips';
import { ShopImageHeader } from '../../components/shop/ShopImageHeader';

function Row({ icon: Icon, label, onPress, value }: { icon: typeof Bell; label: string; onPress: () => void; value?: string }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={theme.colors.primary} /></View>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {value ? <AppText color="secondary" variant="label">{value}</AppText> : null}
      <ChevronRight size={20} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

/** One profile screen for both modes; rows differ by role. Also hosts mode switch + shop selector. */
export function ProfileScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const profile = useAppStore(s => s.profile);
  const mode = useAppStore(s => s.mode);
  const shops = useAppStore(s => s.shops);
  const shop = useAppStore(s => s.selectedShop());
  const [confirm, setConfirm] = useState(false);
  const shopMode = mode === 'SHOPKEEPER';

  const switchMode = () => {
    const next = shopMode ? 'CUSTOMER' : 'SHOPKEEPER';
    useAppStore.getState().setMode(next);
  };
  const changeAvatar = async () => {
    const r = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    const uri = r.assets?.[0]?.uri;
    if (!uri || !profile) return;
    try { await uploadAvatar(profile.id, uri); await useAppStore.getState().loadUserData(); } catch (e) { Alert.alert('Upload failed', friendlyError(e)); }
  };
  const verifyPhone = async () => {
    if (!profile?.phone) { Alert.alert('No phone number', 'Add a phone number when you register to log in with it.'); return; }
    try { const p = await startPhoneVerification(profile.phone); nav.navigate('VerifyOTP', { identifier: p, kind: 'phone_change' }); } catch (e) { Alert.alert('Could not send code', friendlyError(e)); }
  };

  return (
    <Screen>
      <Header back={false} title="Profile" />
      <RoundedCard style={{ alignItems: 'center', gap: 8 }}>
        <Pressable onPress={changeAvatar} accessibilityLabel="Change profile picture"><ProfileAvatar uri={profile?.avatar_url} name={profile?.full_name} size={84} /></Pressable>
        <AppText variant="heading">{profile?.full_name}</AppText>
        {profile?.email ? <AppText color="secondary">{profile.email}</AppText> : null}
        {profile?.phone ? <AppText color="secondary">{profile.phone}</AppText> : null}
      </RoundedCard>

      {/* <RoundedCard tone="mint" style={{ gap: 10 }}>
        <AppText variant="label" color="secondary">You're using KhataConnect as a</AppText>
        <Chips value={mode} onChange={m => useAppStore.getState().setMode(m)} options={[{ key: 'CUSTOMER', label: 'Customer' }, { key: 'SHOPKEEPER', label: 'Shopkeeper' }]} />
        {shopMode && shops.length > 1 ? (<>
          <AppText variant="label" color="secondary">Active shop</AppText>
          <Chips value={shop?.id ?? ''} onChange={id => useAppStore.getState().selectShop(id)} options={shops.map(s => ({ key: s.id, label: s.shop_name }))} />
        </>) : null}
      </RoundedCard> */}

      {shopMode && shops.length > 1 ? (
  <RoundedCard tone="mint" style={{ gap: 10 }}>
    <AppText variant="label" color="secondary">Active shop</AppText>
    <Chips
      value={shop?.id ?? ''}
      onChange={id => useAppStore.getState().selectShop(id)}
      options={shops.map(s => ({ key: s.id, label: s.shop_name }))}
    />
  </RoundedCard>
) : null}

      {shopMode && shop ? <ShopImageHeader cover={shop.cover_image_url} logo={shop.profile_image_url} name={shop.shop_name} subtitle={shop.shop_code} /> : null}

      <RoundedCard style={{ paddingVertical: 4 }}>
        {shopMode ? (<>
          {shop ? <Row icon={QrCode} label="Shop QR & code" onPress={() => nav.navigate('ShopQR')} /> : null}
          {shop ? <Row icon={Pencil} label="Edit shop profile & photos" onPress={() => nav.navigate('ShopProfileEdit')} /> : null}
          {shop ? <Row icon={FileBarChart} label="Financial reports" onPress={() => nav.navigate('Reports')} /> : null}
          {shop ? <Row icon={AlarmClock} label="Reminder settings" onPress={() => nav.navigate('ReminderSettings')} /> : null}
          {shop ? <Row icon={ShieldAlert} label="Disputes" onPress={() => nav.navigate('ShopDisputes')} /> : null}
          <Row icon={Store} label="Register another shop" onPress={() => nav.navigate('ShopRegistration')} />
        </>) : (<>
          <Row icon={QrCode} label="My QR code" onPress={() => nav.navigate('PersonalQR')} />
          <Row icon={Store} label="Connected shops" onPress={() => nav.navigate('CustomerTabs', { screen: 'MyShops' })} />
          <Row icon={ShieldAlert} label="Disputes" onPress={() => nav.navigate('Disputes')} />
        </>)}
        <Row icon={Palette} label="Theme & notifications" onPress={() => nav.navigate('Settings')} />
        {/* <Row icon={Phone} label="Verify phone for phone login" onPress={verifyPhone} /> */}
        <Row icon={Repeat} label={shopMode ? 'Switch to customer' : 'Switch to shopkeeper'} onPress={switchMode} />
      </RoundedCard>

      <Pressable onPress={() => setConfirm(true)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 14 }}>
        <LogOut size={20} color={theme.colors.error} /><AppText color="error" variant="label">Log out</AppText>
      </Pressable>
      <ConfirmationModal visible={confirm} title="Log out?" confirmLabel="Log out" danger onCancel={() => setConfirm(false)}
        onConfirm={async () => { setConfirm(false); await unregisterPush(); await logout(); }} />
    </Screen>
  );
}
