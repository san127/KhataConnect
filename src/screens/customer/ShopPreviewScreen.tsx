import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { PrimaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ShopImageHeader } from '../../components/shop/ShopImageHeader';
import { requestShopConnection } from '../../services/customer/customerService';
import { friendlyError } from '../../utils/errors';
import type { ShopPreview } from '../../types/models';

/** Public shop profile only. No ledger information is exposed before the shopkeeper approves. */
export function ShopPreviewScreen() {
  const nav = useNavigation<any>();
  const { preview } = useRoute<any>().params as { preview: ShopPreview };
  const [status, setStatus] = useState(preview.connection_status);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { await requestShopConnection(preview.id); setStatus('PENDING'); Alert.alert('Request sent', `${preview.shop_name} will be notified. You'll see the shop here once they approve.`); }
    catch (e) { Alert.alert('Could not send request', friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <Header title="Shop profile" />
      <ShopImageHeader cover={preview.cover_image_url} logo={preview.profile_image_url} name={preview.shop_name} subtitle={[preview.category, preview.shop_code].filter(Boolean).join(' · ')} />
      <RoundedCard style={{ gap: 8 }}>
        {preview.address ? <AppText>{preview.address}</AppText> : null}
        {preview.description ? <AppText color="secondary">{preview.description}</AppText> : null}
      </RoundedCard>
      {preview.is_own_shop ? <AppText color="secondary">This is your own shop.</AppText>
        : status === 'APPROVED' ? <><StatusBadge label="Connected" tone="success" /><PrimaryButton title="Open ledger" onPress={() => nav.replace('ShopDetails', { shopId: preview.id, shopName: preview.shop_name })} /></>
        : status === 'PENDING' ? <StatusBadge label="Request pending approval" tone="warning" />
        : <PrimaryButton title="Request connection" onPress={send} loading={busy} />}
    </Screen>
  );
}
