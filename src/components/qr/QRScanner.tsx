// import React, { useCallback, useRef, useState } from 'react';
// import { AppState, Linking, StyleSheet, View } from 'react-native';
// import { useIsFocused } from '@react-navigation/native';
// import { useCameraPermission } from 'react-native-vision-camera';
// import { CodeScanner } from 'react-native-vision-camera-barcode-scanner';
// import { AppText } from '../common/AppText';
// import { PrimaryButton } from '../common/Buttons';
// import { useTheme } from '../../theme/useTheme';

// /** Full-screen QR scanner (VisionCamera). Calls onScan once per distinct value, with a 2s cooldown. */
// export function QRScanner({ onScan, hint }: { onScan: (value: string) => void; hint: string }) {
//   const { theme } = useTheme();
//   const { hasPermission, requestPermission } = useCameraPermission();
//   const focused = useIsFocused();
//   const [appActive, setAppActive] = useState(AppState.currentState === 'active');
//   const last = useRef<{ v: string; t: number } | null>(null);

//   React.useEffect(() => {
//     const s = AppState.addEventListener('change', st => setAppActive(st === 'active'));
//     return () => s.remove();
//   }, []);

//   const handle = useCallback((barcodes: { rawValue?: string }[]) => {
//     const v = barcodes.find(b => b.rawValue)?.rawValue;
//     if (!v) return;
//     const now = Date.now();
//     if (last.current && last.current.v === v && now - last.current.t < 2000) return;
//     last.current = { v, t: now };
//     onScan(v);
//   }, [onScan]);

//   if (!hasPermission) {
//     return (
//       <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
//         <AppText variant="heading" style={{ textAlign: 'center' }}>Camera access needed</AppText>
//         <AppText color="secondary" style={{ textAlign: 'center' }}>KhataConnect uses the camera only to scan QR codes.</AppText>
//         <PrimaryButton title="Allow camera" onPress={async () => { const ok = await requestPermission(); if (!ok) Linking.openSettings(); }} />
//       </View>
//     );
//   }
//   return (
//     <View style={styles.flex}>
//       <CodeScanner style={StyleSheet.absoluteFill} isActive={focused && appActive} barcodeFormats={['qr-code']}
//         onBarcodeScanned={handle} onError={e => console.warn('scanner error', e)} />
//       <View pointerEvents="none" style={styles.overlay}>
//         <View style={{ width: 250, height: 250, borderRadius: 28, borderWidth: 4, borderColor: '#FFFFFFCC' }} />
//         <AppText style={{ color: '#fff', marginTop: 20, textAlign: 'center' }}>{hint}</AppText>
//       </View>
//     </View>
//   );
// }
// const styles = StyleSheet.create({
//   flex: { flex: 1, backgroundColor: '#000' },
//   center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
//   overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
// });




import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCameraDevices,
  useCameraPermission,
} from 'react-native-vision-camera';
import { useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner';
import { AppText } from '../common/AppText';
import { PrimaryButton } from '../common/Buttons';
import { useTheme } from '../../theme/useTheme';

/** Full-screen QR scanner (VisionCamera v5). Calls onScan once per distinct value, with a 2s cooldown. */
export function QRScanner({ onScan, hint }: { onScan: (value: string) => void; hint: string }) {
  const { theme } = useTheme();
  const { hasPermission, requestPermission } = useCameraPermission();
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  // Camera selection: prefer back camera, fall back to any camera the system reports.
  const backDevice = useCameraDevice('back');
  const allDevices = useCameraDevices();
  const device = backDevice ?? allDevices?.[0];

  const last = useRef<{ v: string; t: number } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan; // keep the callback stable for the barcode output

  useEffect(() => {
    const s = AppState.addEventListener('change', st => setAppActive(st === 'active'));
    return () => s.remove();
  }, []);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    console.log(
      '[QRScanner] permission:', hasPermission,
      '| devices:', JSON.stringify((allDevices ?? []).map((d: any) => ({ id: d.id, position: d.position }))),
      '| back:', !!backDevice,
    );
  }, [hasPermission, allDevices, backDevice]);

  const handle = useCallback((barcodes: ReadonlyArray<{ rawValue?: string }>) => {
    const v = barcodes.find(b => b.rawValue)?.rawValue;
    if (!v) return;
    const now = Date.now();
    if (last.current && last.current.v === v && now - last.current.t < 2000) return;
    last.current = { v, t: now };
    onScanRef.current(v);
  }, []);

  // Hooks must run before any early return.
  const barcodeOutput = useBarcodeScannerOutput({
    barcodeFormats: ['qr-code'],
    onBarcodeScanned: handle,
    onError: e => console.warn('[QRScanner] scanner error', e),
  });

  if (!hasPermission) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <AppText variant="heading" style={{ textAlign: 'center' }}>Camera access needed</AppText>
        <AppText color="secondary" style={{ textAlign: 'center' }}>
          KhataConnect uses the camera only to scan QR codes.
        </AppText>
        <PrimaryButton
          title="Allow camera"
          onPress={async () => {
            const ok = await requestPermission();
            if (!ok) Linking.openSettings();
          }}
        />
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <AppText variant="heading" style={{ textAlign: 'center' }}>Camera not available</AppText>
        <AppText color="secondary" style={{ textAlign: 'center' }}>
          No camera was found on this device. Close other apps using the camera and try again.
          {` (devices found: ${allDevices?.length ?? 0})`}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={focused && appActive}
        outputs={[barcodeOutput]}
      />
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.frame} />
        <AppText style={{ color: '#fff', marginTop: 20, textAlign: 'center' }}>{hint}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  frame: { width: 250, height: 250, borderRadius: 28, borderWidth: 4, borderColor: '#FFFFFFCC' },
});