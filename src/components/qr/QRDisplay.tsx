import React, { useRef } from 'react';
import { Alert, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share';
import Clipboard from '@react-native-clipboard/clipboard';
import { Copy, Share2 } from 'lucide-react-native';
import { AppText } from '../common/AppText';
import { SecondaryButton } from '../common/Buttons';
import { useTheme } from '../../theme/useTheme';

type Props = { value: string; caption?: string; code?: string; shareMessage?: string; size?: number };

/** QR is always dark-on-white so it scans reliably in both themes. Payload is an opaque token only. */
export function QRDisplay({ value, caption, code, shareMessage, size = 220 }: Props) {
  const { theme } = useTheme();
  const ref = useRef<{ toDataURL: (cb: (d: string) => void) => void } | null>(null);

  const share = () => {
    ref.current?.toDataURL(async data => {
      try {
        await Share.open({ url: `data:image/png;base64,${data}`, message: shareMessage, title: 'KhataConnect QR', failOnCancel: false });
      } catch { Alert.alert('Could not share', 'Please try again.'); }
    });
  };
  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <View style={{ backgroundColor: '#FFFFFF', padding: 18, borderRadius: theme.radius.xl, ...theme.shadow }}>
        <QRCode value={value} size={size} color="#2E3A30" backgroundColor="#FFFFFF" ecl="M" getRef={r => { ref.current = r as never; }} />
      </View>
      {caption ? <AppText color="secondary" style={{ textAlign: 'center' }}>{caption}</AppText> : null}
      {code ? <AppText variant="title" style={{ letterSpacing: 2 }}>{code}</AppText> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {code ? <SecondaryButton title="Copy code" icon={<Copy size={18} color={theme.colors.text} />} onPress={() => { Clipboard.setString(code); Alert.alert('Copied', code); }} /> : null}
        <SecondaryButton title="Share / Save" icon={<Share2 size={18} color={theme.colors.text} />} onPress={share} />
      </View>
    </View>
  );
}
