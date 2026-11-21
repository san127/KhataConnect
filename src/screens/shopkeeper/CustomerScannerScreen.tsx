import React, { useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QRScanner } from '../../components/qr/QRScanner';
import { Header } from '../../components/common/Header';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { AppText } from '../../components/common/AppText';
import { useAppStore } from '../../store/appStore';
import { getCustomerByToken, requestCustomerConnection } from '../../services/customer/customerService';
import { friendlyError } from '../../utils/errors';

/** Shopkeeper scans a customer's personal QR -> sees the name -> sends a request the customer must approve. */
export function CustomerScannerScreen() {
  const nav = useNavigation<any>();
  const shopId = useAppStore(s => s.selectedShopId)!;
  const [found, setFound] = useState<{ token: string; id: string; full_name: string; avatar_url: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  const onScan = async (token: string) => {
    if (locked.current) return;
    locked.current = true;
    try { setFound({ token, ...(await getCustomerByToken(token)) }); }
    catch (e) { Alert.alert('QR not accepted', friendlyError(e), [{ text: 'OK', onPress: () => { locked.current = false; } }]); }
  };
  const send = async () => {
    if (!found) return;
    setBusy(true);
    try {
      await requestCustomerConnection(shopId, found.token);
      setFound(null);
      Alert.alert('Request sent', `${found.full_name} will get a notification to approve.`, [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch (e) { Alert.alert('Could not send', friendlyError(e), [{ text: 'OK', onPress: () => { setFound(null); locked.current = false; } }]); } finally { setBusy(false); }
  };
  return (
    <View style={{ flex: 1 }}>
      <QRScanner onScan={onScan} hint="Scan the customer's KhataConnect QR (Profile → My QR code)" />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 16 }}><Header title="Add customer" /></SafeAreaView>
      <ConfirmationModal visible={!!found} title="Add this customer?" confirmLabel="Send request" loading={busy}
        onCancel={() => { setFound(null); locked.current = false; }} onConfirm={send}>
        {found ? <View style={{ alignItems: 'center', gap: 8 }}><ProfileAvatar uri={found.avatar_url} name={found.full_name} size={64} /><AppText variant="heading">{found.full_name}</AppText>
          <AppText variant="caption" color="secondary" style={{ textAlign: 'center' }}>They must approve before you can add udhaar.</AppText></View> : null}
      </ConfirmationModal>
    </View>
  );
}
