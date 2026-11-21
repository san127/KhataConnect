import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { QRDisplay } from '../../components/qr/QRDisplay';
import { SecondaryButton } from '../../components/common/Buttons';
import { AppText } from '../../components/common/AppText';
import { useAppStore } from '../../store/appStore';
import { regenerateShopQr } from '../../services/shop/shopService';
import { friendlyError } from '../../utils/errors';

export function ShopQRScreen() {
  const shop = useAppStore(s => s.selectedShop());
  const [busy, setBusy] = useState(false);
  if (!shop) return null;
  const regenerate = () => Alert.alert('Generate a new QR?', 'The old printed QR will stop working. The shop code stays the same.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Generate', onPress: async () => {
      setBusy(true);
      try { await regenerateShopQr(shop.id); await useAppStore.getState().refreshShops(); } catch (e) { Alert.alert('Failed', friendlyError(e)); } finally { setBusy(false); }
    } },
  ]);
  return (
    <Screen>
      <Header title="Shop QR & code" subtitle={shop.shop_name} />
      <AppText color="secondary">Customers scan this QR or type the shop code to ask to connect. You approve every request.</AppText>
      <QRDisplay value={shop.qr_token} code={shop.shop_code} caption={shop.shop_name} shareMessage={`Connect to ${shop.shop_name} on KhataConnect. Shop code: ${shop.shop_code}`} />
      <SecondaryButton title="Generate a new QR" onPress={regenerate} loading={busy} />
    </Screen>
  );
}
