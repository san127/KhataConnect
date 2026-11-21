// import React, { useRef, useState } from 'react';
// import { Alert, View } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { QRScanner } from '../../components/qr/QRScanner';
// import { Header } from '../../components/common/Header';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { LoadingIndicator } from '../../components/common/States';
// import { previewShopByToken } from '../../services/shop/shopService';
// import { friendlyError } from '../../utils/errors';

// /** Customer scans a shop QR -> validates token on the server -> shows the public shop profile. */
// export function ScanShopQRScreen() {
//   const nav = useNavigation<any>();
//   const [busy, setBusy] = useState(false);
//   const locked = useRef(false);
//   const onScan = async (v: string) => {
//     if (locked.current) return;
//     locked.current = true; setBusy(true);
//     try {
//       const preview = await previewShopByToken(v);
//       nav.replace('ShopPreview', { preview });
//     } catch (e) {
//       Alert.alert('QR not accepted', friendlyError(e), [{ text: 'OK', onPress: () => { locked.current = false; } }]);
//     } finally { setBusy(false); }
//   };
//   return (
//     <View style={{ flex: 1 }}>
//       <QRScanner onScan={onScan} hint="Point at the shop's KhataConnect QR" />
//       <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 16 }}><Header title="Scan shop QR" /></SafeAreaView>
//       {busy ? <View style={{ position: 'absolute', bottom: 60, alignSelf: 'center' }}><LoadingIndicator /></View> : null}
//     </View>
//   );
// }




import React, { useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QRScanner } from '../../components/qr/QRScanner';
import { Header } from '../../components/common/Header';
import { LoadingIndicator } from '../../components/common/States';

import { previewShopByToken } from '../../services/shop/shopService';
import { friendlyError } from '../../utils/errors';

export function ScanShopQRScreen() {
  const nav = useNavigation<any>();

  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  const onScan = async (value: string) => {
    if (locked.current) return;

    locked.current = true;
    setBusy(true);

    try {
      const preview = await previewShopByToken(value);
      nav.replace('ShopPreview', { preview });
    } catch (error) {
      Alert.alert(
        'QR not accepted',
        friendlyError(error),
        [
          {
            text: 'OK',
            onPress: () => {
              locked.current = false;
            },
          },
        ]
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <QRScanner
        onScan={onScan}
        hint="Point at the shop's KhataConnect QR"
      />

      <SafeAreaView
        edges={['top']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 16,
        }}
      >
        <Header title="Scan shop QR" />
      </SafeAreaView>

      {busy && (
        <View
          style={{
            position: 'absolute',
            bottom: 60,
            alignSelf: 'center',
          }}
        >
          <LoadingIndicator />
        </View>
      )}
    </View>
  );
}
