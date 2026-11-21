import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { AppInput } from '../../components/common/AppInput';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Chips } from '../../components/common/Chips';
import { ErrorState, LoadingIndicator } from '../../components/common/States';
import { useLoad } from '../../hooks/useLoad';
import { getPayment, rejectPayment, verifyPayment } from '../../services/payment/paymentService';
import { listBalances } from '../../services/transaction/transactionService';
import { allocateOldestFirst, formatINR, toPaise, Allocation } from '../../utils/money';
import { friendlyError } from '../../utils/errors';
import { fmtDate, fmtDateTime } from '../../utils/dates';
import { haptic } from '../../hooks/useHaptic';

/** Only the shop owner can confirm. Default allocation = oldest bill first; owner may allocate manually. */
export function PaymentVerificationScreen() {
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [manual, setManual] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const p = await getPayment(id);
    const bills = (await listBalances({ shopId: p.shop_id, customerId: p.customer_id })).filter(b => b.transaction_status !== 'VOIDED' && b.remaining_amount > 0)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { p, bills };
  }, [id]);

  const auto = useMemo<Allocation[] | null>(() => {
    if (!data) return null;
    try { return allocateOldestFirst(data.p.amount, data.bills.map(b => ({ id: b.transaction_id, remaining: b.remaining_amount, createdAt: b.created_at })), data.p.transaction_id); }
    catch { return null; }
  }, [data]);
  const manualAllocs = useMemo<Allocation[]>(() => Object.entries(manual).filter(([, v]) => Number(v) > 0).map(([transaction_id, v]) => ({ transaction_id, amount: Number(v) })), [manual]);
  const manualSum = manualAllocs.reduce((s, a) => s + toPaise(a.amount), 0);

  if (loading) return <Screen><Header title="Verify payment" /><LoadingIndicator /></Screen>;
  if (error || !data) return <Screen><Header title="Verify payment" /><ErrorState message={error ?? ''} onRetry={reload} /></Screen>;
  const { p, bills } = data;
  if (p.verification_status !== 'PENDING') {
    return <Screen><Header title="Verify payment" /><RoundedCard><StatusBadge label={`Already ${p.verification_status.toLowerCase()}`} tone="neutral" /></RoundedCard></Screen>;
  }

  const receive = async () => {
    if (mode === 'manual') {
      if (manualSum !== toPaise(p.amount)) { Alert.alert('Allocation must match', `Allocated ${formatINR(manualSum / 100)} but the payment is ${formatINR(p.amount)}.`); return; }
      for (const a of manualAllocs) {
        const b = bills.find(x => x.transaction_id === a.transaction_id);
        if (!b || toPaise(a.amount) > toPaise(b.remaining_amount)) { Alert.alert('Too much for one bill', 'You can\'t allocate more than a bill\'s remaining amount.'); return; }
      }
    } else if (!auto) { Alert.alert('Payment is larger than the outstanding balance', 'Reject it, or ask the customer to declare the correct amount.'); return; }
    setBusy(true);
    try {
      await verifyPayment(id, mode === 'manual' ? manualAllocs : undefined);
      haptic('notificationSuccess');
      Alert.alert('Marked as received', 'The balance is updated and the customer has a receipt.', [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch (e) { haptic('notificationError'); Alert.alert('Could not verify', friendlyError(e)); await reload(); } finally { setBusy(false); }
  };
  const reject = async () => {
    setBusy(true);
    try { await rejectPayment(id, reason); setRejectOpen(false); nav.goBack(); }
    catch (e) { Alert.alert('Could not reject', friendlyError(e)); } finally { setBusy(false); }
  };

  const preview = mode === 'auto' ? auto : manualAllocs;
  return (
    <Screen>
      <Header title="Verify payment" subtitle={p.profiles?.full_name} />
      <RoundedCard tone="mint" style={{ gap: 8, alignItems: 'center' }}>
        <AmountDisplay amount={p.amount} size="display" />
        <StatusBadge label={`${p.payment_method} · ${p.payment_type === 'INDIVIDUAL' ? 'for one bill' : 'overall outstanding'}`} tone="warning" />
        <AppText variant="caption" color="secondary">Declared {fmtDateTime(p.declared_at)}</AppText>
      </RoundedCard>
      <AppText color="secondary">{p.payment_method === 'UPI' ? 'Check your UPI app to confirm this amount actually arrived before marking it received.' : 'Confirm you physically received this cash.'}</AppText>

      <AppText variant="heading">Apply to bills</AppText>
      <Chips value={mode} onChange={setMode} options={[{ key: 'auto', label: 'Oldest first' }, { key: 'manual', label: 'Choose bills' }]} />
      {mode === 'auto' ? (
        <RoundedCard style={{ gap: 8 }}>
          {auto ? auto.map(a => {
            const b = bills.find(x => x.transaction_id === a.transaction_id)!;
            return <View key={a.transaction_id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText color="secondary">Bill of {fmtDate(b.created_at)}</AppText><AppText variant="label">{formatINR(a.amount)}</AppText></View>;
          }) : <AppText color="error">This is more than the customer owes ({formatINR(bills.reduce((s, b) => s + b.remaining_amount, 0))}).</AppText>}
        </RoundedCard>
      ) : (
        <View style={{ gap: 10 }}>
          {bills.map(b => (
            <RoundedCard key={b.transaction_id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="label">Bill of {fmtDate(b.created_at)}</AppText><AppText color="secondary">Left {formatINR(b.remaining_amount)}</AppText></View>
              <AppInput placeholder="Amount to apply ₹" keyboardType="decimal-pad" value={manual[b.transaction_id] ?? ''} onChangeText={t => setManual(m => ({ ...m, [b.transaction_id]: t.replace(/[^0-9.]/g, '') }))} />
            </RoundedCard>
          ))}
          <AppText color={manualSum === toPaise(p.amount) ? 'success' : 'warning'}>Allocated {formatINR(manualSum / 100)} of {formatINR(p.amount)}</AppText>
        </View>
      )}
      {preview === null ? null : null}
      <PrimaryButton title="Mark as received" onPress={receive} loading={busy} />
      <SecondaryButton title="Reject payment" tone="danger" onPress={() => setRejectOpen(true)} disabled={busy} />
      <ConfirmationModal visible={rejectOpen} title="Reject this payment?" message="The balance will not change and the customer will be told." confirmLabel="Reject" danger loading={busy} onCancel={() => setRejectOpen(false)} onConfirm={reject}>
        <AppInput label="Reason (optional)" value={reason} onChangeText={setReason} placeholder="e.g. Not received in my UPI app" />
      </ConfirmationModal>
    </Screen>
  );
}
