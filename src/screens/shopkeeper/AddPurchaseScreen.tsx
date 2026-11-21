import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Plus, Trash2 } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { AppInput } from '../../components/common/AppInput';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { SearchBar } from '../../components/common/SearchBar';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { ErrorState, LoadingIndicator, EmptyState } from '../../components/common/States';
import { DueDatePicker } from '../../components/forms/DueDatePicker';
import { useLoad } from '../../hooks/useLoad';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { shopCustomerSummaries } from '../../services/customer/customerService';
import { addPurchase } from '../../services/transaction/transactionService';
import { itemSchema } from '../../utils/validation';
import { lineSubtotal, purchaseTotal, formatINR } from '../../utils/money';
import { friendlyError } from '../../utils/errors';
import { fmtDate } from '../../utils/dates';
import { haptic } from '../../hooks/useHaptic';

type Row = { key: number; name: string; qty: string; price: string };
const blank = (key: number): Row => ({ key, name: '', qty: '1', price: '' });
const toItem = (r: Row) => ({ item_name: r.name, quantity: Number(r.qty), unit_price: Number(r.price) });

/** Step 1 pick customer -> Step 2 itemised entry -> Step 3 review & confirm. Server recomputes totals. */
export function AddPurchaseScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const params = (useRoute<any>().params ?? {}) as { customerId?: string; customerName?: string };
  const shopId = useAppStore(s => s.selectedShopId)!;
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(params.customerId ? { id: params.customerId, name: params.customerName ?? 'Customer' } : null);
  const [rows, setRows] = useState<Row[]>([blank(1)]);
  const [nextKey, setNextKey] = useState(2);
  const [notes, setNotes] = useState('');
  const [due, setDue] = useState<string | null>(null);
  const [step, setStep] = useState<'items' | 'review'>('items');
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: customers, loading, error, reload } = useLoad(() => shopCustomerSummaries(shopId), [shopId]);
  const items = useMemo(() => rows.map(toItem), [rows]);
  const total = useMemo(() => purchaseTotal(items.filter(i => i.item_name.trim() && i.quantity > 0 && i.unit_price >= 0)), [items]);
  useEffect(() => { if (step === 'items') setErrors({}); }, [step]);

  const update = (key: number, patch: Partial<Row>) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const validate = () => {
    const errs: Record<number, string> = {};
    rows.forEach(r => { const p = itemSchema.safeParse(toItem(r)); if (!p.success) errs[r.key] = p.error.issues[0].message; });
    setErrors(errs);
    if (Object.keys(errs).length) return false;
    if (total <= 0) { Alert.alert('Add at least one item with a price'); return false; }
    return true;
  };
  const confirm = async () => {
    if (!customer) return;
    setBusy(true);
    try {
      await addPurchase({ shopId, customerId: customer.id, items, dueDate: due, notes });
      haptic('notificationSuccess');
      Alert.alert('Udhaar added', `${formatINR(total)} added to ${customer.name}'s khata. They've been notified.`, [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch (e) { haptic('notificationError'); Alert.alert('Could not save', friendlyError(e)); } finally { setBusy(false); }
  };

  if (!customer) {
    const list = (customers ?? []).filter(c => !q.trim() || c.full_name.toLowerCase().includes(q.trim().toLowerCase()));
    return (
      <Screen>
        <Header title="Add udhaar" subtitle="Choose a customer" />
        <SearchBar value={q} onChangeText={setQ} placeholder="Search customers" />
        {loading ? <LoadingIndicator /> : error ? <ErrorState message={error} onRetry={reload} />
          : list.length === 0 ? <EmptyState title="No connected customers" message="Add a customer first by scanning their QR or approving a request." />
          : list.map(c => (
            <RoundedCard key={c.customer_id} onPress={() => setCustomer({ id: c.customer_id, name: c.full_name })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ProfileAvatar name={c.full_name} size={44} />
                <AppText variant="heading" style={{ flex: 1 }}>{c.full_name}</AppText>
                <AmountDisplay amount={c.outstanding} />
              </View>
            </RoundedCard>
          ))}
      </Screen>
    );
  }

  if (step === 'review') {
    return (
      <Screen>
        <Header title="Review udhaar" subtitle={customer.name} />
        <RoundedCard style={{ gap: 12 }}>
          {items.map((i, idx) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flex: 1 }}><AppText variant="label">{i.item_name}</AppText><AppText variant="caption" color="secondary">{i.quantity} × {formatINR(i.unit_price)}</AppText></View>
              <AmountDisplay amount={lineSubtotal(i)} />
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: theme.colors.border }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="heading">Total</AppText><AmountDisplay amount={total} size="heading" /></View>
          <AppText variant="caption" color="secondary">Due: {due ? fmtDate(due) : 'no date'}{notes ? ` · ${notes}` : ''}</AppText>
        </RoundedCard>
        <AppText variant="caption" color="secondary">Once saved, a purchase can't be edited. If something's wrong the customer can dispute it and you can cancel it with a reason.</AppText>
        <PrimaryButton title="Confirm & notify customer" onPress={confirm} loading={busy} />
        <SecondaryButton title="Edit items" onPress={() => setStep('items')} disabled={busy} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Add udhaar" subtitle={customer.name} />
      {rows.map((r, idx) => (
        <RoundedCard key={r.key} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="label" color="secondary">Item {idx + 1}</AppText>
            {rows.length > 1 ? <Pressable hitSlop={12} accessibilityLabel="Remove item" onPress={() => setRows(rs => rs.filter(x => x.key !== r.key))}><Trash2 size={20} color={theme.colors.error} /></Pressable> : null}
          </View>
          <AppInput placeholder="Item name (e.g. Rice)" value={r.name} onChangeText={t => update(r.key, { name: t })} autoCapitalize="words" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><AppInput label="Quantity" value={r.qty} onChangeText={t => update(r.key, { qty: t.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" /></View>
            <View style={{ flex: 1 }}><AppInput label="Unit price ₹" value={r.price} onChangeText={t => update(r.key, { price: t.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" /></View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText color="secondary">Subtotal</AppText><AmountDisplay amount={Number(r.qty) > 0 && Number(r.price) >= 0 ? lineSubtotal({ quantity: Number(r.qty), unit_price: Number(r.price) }) : 0} />
          </View>
          {errors[r.key] ? <AppText variant="caption" color="error">{errors[r.key]}</AppText> : null}
        </RoundedCard>
      ))}
      <SecondaryButton title="Add another item" icon={<Plus size={18} color={theme.colors.text} />} onPress={() => { setRows(rs => [...rs, blank(nextKey)]); setNextKey(k => k + 1); }} />
      <RoundedCard tone="mint" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="heading">Total</AppText><AmountDisplay amount={total} size="title" />
      </RoundedCard>
      <DueDatePicker value={due} onChange={setDue} />
      <AppInput label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      <PrimaryButton title="Review" onPress={() => { if (validate()) setStep('review'); }} />
    </Screen>
  );
}
