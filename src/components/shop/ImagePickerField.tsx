import React, { useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { ImagePlus, Trash2 } from 'lucide-react-native';
import { AppText } from '../common/AppText';
import { SecondaryButton } from '../common/Buttons';
import { useTheme } from '../../theme/useTheme';
import { friendlyError } from '../../utils/errors';

type Props = {
  label: string; hint?: string; currentUrl?: string | null; shape?: 'square' | 'wide';
  onUpload: (localUri: string) => Promise<void>; onRemove?: () => Promise<void>;
};

/** Pick from gallery -> preview -> upload (compression happens in the upload service). Optional by design. */
export function ImagePickerField({ label, hint, currentUrl, shape = 'square', onUpload, onRemove }: Props) {
  const { theme } = useTheme();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = preview ?? currentUrl ?? null;
  const h = shape === 'wide' ? 130 : 150;

  const pick = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 1 });
    if (res.didCancel) return;
    if (res.errorCode) { Alert.alert('Could not open gallery', res.errorMessage ?? res.errorCode); return; }
    const uri = res.assets?.[0]?.uri;
    if (!uri) return;
    setPreview(uri);
    setBusy(true);
    try { await onUpload(uri); }
    catch (e) { setPreview(null); Alert.alert('Upload failed', friendlyError(e)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!onRemove) return;
    setBusy(true);
    try { await onRemove(); setPreview(null); } catch (e) { Alert.alert('Could not remove', friendlyError(e)); } finally { setBusy(false); }
  };

  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label" color="secondary">{label}</AppText>
      <Pressable onPress={pick} disabled={busy} style={{ height: h, borderRadius: theme.radius.lg, backgroundColor: theme.colors.mint, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.secondary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {shown ? <Image source={{ uri: shown }} style={{ width: '100%', height: '100%', opacity: busy ? 0.5 : 1 }} resizeMode="cover" />
          : <View style={{ alignItems: 'center', gap: 6 }}><ImagePlus size={28} color={theme.colors.primary} /><AppText variant="label" color="secondary">Tap to choose a photo</AppText></View>}
      </Pressable>
      {hint ? <AppText variant="caption" color="secondary">{hint}</AppText> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SecondaryButton title={shown ? 'Replace' : 'Choose photo'} onPress={pick} loading={busy} style={{ flex: 1 }} />
        {shown && onRemove ? <SecondaryButton title="Remove" tone="danger" onPress={remove} disabled={busy} icon={<Trash2 size={18} color={theme.colors.error} />} /> : null}
      </View>
    </View>
  );
}
