import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { AppInput } from '../../components/common/AppInput';
import { PrimaryButton } from '../../components/common/Buttons';
import { AppText } from '../../components/common/AppText';
import { shopCodeSchema } from '../../utils/validation';
import { previewShopByCode } from '../../services/shop/shopService';
import { friendlyError } from '../../utils/errors';

export function EnterShopCodeScreen() {
  const nav = useNavigation<any>();
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const p = shopCodeSchema.safeParse({ code });
    if (!p.success) { setErr(p.error.issues[0].message); return; }
    setErr(null); setBusy(true);
    try { nav.replace('ShopPreview', { preview: await previewShopByCode(p.data.code) }); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <Header title="Enter shop code" />
      <AppText color="secondary">Ask the shopkeeper for their code. It looks like KH-SAI102.</AppText>
      <AppInput label="Shop code" value={code} onChangeText={t => setCode(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false}
        placeholder="KH-SAI102" error={err ?? undefined} onSubmitEditing={submit} style={{ letterSpacing: 2, fontSize: 20 }} />
      <PrimaryButton title="Find shop" onPress={submit} loading={busy} />
    </Screen>
  );
}
