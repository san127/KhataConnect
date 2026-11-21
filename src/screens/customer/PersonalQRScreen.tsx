import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { QRDisplay } from '../../components/qr/QRDisplay';
import { SecondaryButton } from '../../components/common/Buttons';
import { AppText } from '../../components/common/AppText';
import { ErrorState, LoadingIndicator } from '../../components/common/States';
import { useLoad } from '../../hooks/useLoad';
import { useAppStore } from '../../store/appStore';
import { getMyQrToken, regenerateMyQr, revokeMyQr } from '../../services/profile/profileService';
import { friendlyError } from '../../utils/errors';

/** The QR holds only a random token. No name, phone or email is encoded. */
export function PersonalQRScreen() {
  const uid = useAppStore(s => s.session?.user.id)!;
  const { data, loading, error, reload, setData } = useLoad(() => getMyQrToken(uid), [uid]);
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    try { await fn(); after?.(); await reload(); } catch (e) { Alert.alert('Failed', friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <Header title="My QR code" />
      <AppText color="secondary">Show this to a shopkeeper so they can add you as a customer. You'll get a request to approve.</AppText>
      {loading ? <LoadingIndicator /> : error ? <ErrorState message={error} onRetry={reload} />
        : data ? <QRDisplay value={data} caption="Scan with the shopkeeper's KhataConnect" shareMessage="My KhataConnect customer QR" />
        : <AppText color="warning" style={{ textAlign: 'center' }}>Your QR is currently turned off.</AppText>}
      <SecondaryButton title="Generate a new QR (old one stops working)" loading={busy} onPress={() => act(regenerateMyQr)} />
      {data ? <SecondaryButton title="Turn QR off" tone="danger" disabled={busy} onPress={() => Alert.alert('Turn off QR?', 'Shopkeepers won\'t be able to scan it until you generate a new one.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Turn off', style: 'destructive', onPress: () => act(revokeMyQr, () => setData(null)) }])} /> : null}
    </Screen>
  );
}
