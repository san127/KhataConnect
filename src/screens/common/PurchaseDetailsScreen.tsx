import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { AppInput } from '../../components/common/AppInput';
import { ErrorState, LoadingIndicator } from '../../components/common/States';
import { SectionTitle } from '../../components/common/SectionTitle';
import { purchaseStatus } from '../../components/cards/PurchaseCard';
import { useLoad } from '../../hooks/useLoad';
import { useAppStore } from '../../store/appStore';
import { acknowledgePurchase, getPurchase, raiseDispute, resolveDispute } from '../../services/transaction/transactionService';
import { friendlyError } from '../../utils/errors';
import { fmtDate, fmtDateTime } from '../../utils/dates';
import { formatINR } from '../../utils/money';
import { useTheme } from '../../theme/useTheme';

export function PurchaseDetailsScreen() {
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const { theme } = useTheme();
  const uid = useAppStore(s => s.session?.user.id);
  const { data, loading, error, reload, refreshing } = useLoad(() => getPurchase(id), [id]);
  const [busy, setBusy] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState<null | 'void' | 'uphold'>(null);
  const [reason, setReason] = useState('');
  const [desc, setDesc] = useState('');

  if (loading) return <Screen><Header title="Purchase" /><LoadingIndicator /></Screen>;
  if (error || !data) return <Screen><Header title="Purchase" /><ErrorState message={error ?? 'Not found'} onRetry={reload} /></Screen>;

  const { balance: b, items, shop, customer, audit, dispute, payments } = data;
  const isCustomer = uid === b.customer_id;
  const isOwner = uid === shop.owner_id;
  const st = purchaseStatus(b);
  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try { await fn(); if (done) Alert.alert(done); await reload(); } catch (e) { Alert.alert('Something went wrong', friendlyError(e)); } finally { setBusy(false); }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header title={`Bill ${b.transaction_id.slice(0, 8).toUpperCase()}`} subtitle={`${shop.shop_name} · ${fmtDateTime(b.created_at)}`} />
      <RoundedCard tone="mint" style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText color="secondary">{isOwner ? customer.full_name : shop.shop_name}</AppText>
          <StatusBadge label={st.label} tone={st.tone} />
        </View>
        <AmountDisplay amount={b.remaining_amount} size="display" color={b.remaining_amount > 0 ? undefined : 'success'} />
        <AppText variant="caption" color="secondary">remaining of {formatINR(b.total_amount)} · paid {formatINR(b.paid_amount)}{b.due_date ? ` · due ${fmtDate(b.due_date)}` : ''}</AppText>
      </RoundedCard>

      <SectionTitle title="Items" />
      <RoundedCard style={{ gap: 12 }}>
        {items.map(i => (
          <View key={i.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="label">{i.item_name}</AppText>
              <AppText variant="caption" color="secondary">{i.quantity} × {formatINR(i.unit_price)}</AppText>
            </View>
            <AmountDisplay amount={i.subtotal} />
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: theme.colors.border }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="heading">Total</AppText><AmountDisplay amount={b.total_amount} size="heading" />
        </View>
        {b.notes ? <AppText color="secondary">Note: {b.notes}</AppText> : null}
      </RoundedCard>

      {payments.length > 0 ? (<>
        <SectionTitle title="Payments received" />
        <RoundedCard style={{ gap: 10 }}>
          {payments.map(p => (
            <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText color="secondary">{p.payments.payment_method} · {fmtDate(p.payments.verified_at)}</AppText>
              <AmountDisplay amount={p.allocated_amount} />
            </View>
          ))}
        </RoundedCard>
      </>) : null}

      {dispute ? (
        <RoundedCard style={{ gap: 6, borderColor: theme.colors.error }}>
          <StatusBadge label={dispute.dispute_status === 'OPEN' ? 'Dispute open' : dispute.dispute_status === 'RESOLVED_VOIDED' ? 'Dispute: purchase cancelled' : 'Dispute: purchase kept'} tone={dispute.dispute_status === 'OPEN' ? 'error' : 'neutral'} />
          <AppText>{dispute.dispute_reason}</AppText>
          {dispute.description ? <AppText color="secondary">{dispute.description}</AppText> : null}
          {dispute.resolution_notes ? <AppText color="secondary">Shop reply: {dispute.resolution_notes}</AppText> : null}
        </RoundedCard>
      ) : null}

      {isCustomer && b.transaction_status !== 'VOIDED' ? (
        <View style={{ gap: 10 }}>
          {b.acknowledgement_status === 'AWAITING' ? <PrimaryButton title="Acknowledge purchase" loading={busy} onPress={() => run(() => acknowledgePurchase(id))} /> : null}
          {b.remaining_amount > 0 ? <PrimaryButton title="Pay this bill" onPress={() => nav.navigate('PaymentDeclaration', { shopId: shop.id, shopName: shop.shop_name, transactionId: id })} /> : null}
          {b.acknowledgement_status !== 'DISPUTED' ? <SecondaryButton title="Something's wrong — dispute" tone="danger" onPress={() => setDisputeOpen(true)} /> : null}
        </View>
      ) : null}
      {isOwner && dispute?.dispute_status === 'OPEN' ? (
        <View style={{ gap: 10 }}>
          <PrimaryButton title="Keep purchase (reject dispute)" onPress={() => setResolveOpen('uphold')} />
          <SecondaryButton title="Cancel purchase" tone="danger" onPress={() => setResolveOpen('void')} />
        </View>
      ) : null}

      {audit.length > 0 ? (<>
        <SectionTitle title="History" />
        <RoundedCard style={{ gap: 8 }}>
          {audit.map(a => (
            <View key={a.id}>
              <AppText variant="label">{a.action.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}</AppText>
              <AppText variant="caption" color="secondary">{fmtDateTime(a.created_at)}{a.reason ? ` · ${a.reason}` : ''}</AppText>
            </View>
          ))}
        </RoundedCard>
      </>) : null}

      <ConfirmationModal visible={disputeOpen} title="Dispute this purchase" confirmLabel="Send dispute" danger loading={busy}
        onCancel={() => setDisputeOpen(false)}
        onConfirm={async () => { if (!reason.trim()) { Alert.alert('Please add a reason'); return; } setDisputeOpen(false); await run(() => raiseDispute(id, reason, desc), 'Dispute sent to the shop'); setReason(''); setDesc(''); }}>
        <AppInput label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. Wrong quantity" />
        <AppInput label="Details (optional)" value={desc} onChangeText={setDesc} multiline />
      </ConfirmationModal>
      <ConfirmationModal visible={!!resolveOpen} title={resolveOpen === 'void' ? 'Cancel this purchase?' : 'Keep this purchase?'}
        message={resolveOpen === 'void' ? 'The bill stays in the history as cancelled and no longer counts toward the balance.' : 'The customer will be told the bill is correct.'}
        confirmLabel={resolveOpen === 'void' ? 'Cancel purchase' : 'Keep purchase'} danger={resolveOpen === 'void'} loading={busy}
        onCancel={() => setResolveOpen(null)}
        onConfirm={async () => { const v = resolveOpen === 'void'; setResolveOpen(null); await run(() => resolveDispute(dispute!.id, v, reason), 'Dispute resolved'); setReason(''); }}>
        <AppInput label="Note to customer (optional)" value={reason} onChangeText={setReason} />
      </ConfirmationModal>
    </Screen>
  );
}
