import React from 'react';
import { View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { CheckCircle2 } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ErrorState, LoadingIndicator } from '../../components/common/States';
import { useLoad } from '../../hooks/useLoad';
import { getPayment, getReceipt } from '../../services/payment/paymentService';
import { fmtDate, fmtDateTime } from '../../utils/dates';
import { formatINR } from '../../utils/money';
import { useTheme } from '../../theme/useTheme';

/** Payment status; once the shop marks it received this becomes a digital receipt. */
export function PaymentDetailsScreen() {
  const { id } = useRoute<any>().params as { id: string };
  const { theme } = useTheme();
  const { data, loading, error, reload } = useLoad(async () => {
    const p = await getPayment(id);
    const receipt = p.verification_status === 'RECEIVED' ? await getReceipt(id) : null;
    return { p, receipt };
  }, [id]);
  if (loading) return <Screen><Header title="Payment" /><LoadingIndicator /></Screen>;
  if (error || !data) return <Screen><Header title="Payment" /><ErrorState message={error ?? 'Not found'} onRetry={reload} /></Screen>;
  const { p, receipt } = data;
  const tone = p.verification_status === 'RECEIVED' ? 'success' : p.verification_status === 'REJECTED' ? 'error' : 'warning';
  return (
    <Screen>
      <Header title={receipt ? 'Payment receipt' : 'Payment'} />
      <RoundedCard tone="mint" style={{ alignItems: 'center', gap: 8 }}>
        {receipt ? <CheckCircle2 size={40} color={theme.colors.success} /> : null}
        <AmountDisplay amount={p.amount} size="display" />
        <StatusBadge tone={tone} label={p.verification_status === 'PENDING' ? 'Awaiting shop verification' : p.verification_status === 'RECEIVED' ? 'Received' : 'Rejected'} />
        {p.verification_status === 'PENDING' ? <AppText variant="caption" color="secondary" style={{ textAlign: 'center' }}>Your balance updates once the shop confirms this payment.</AppText> : null}
        {p.rejection_reason ? <AppText color="error" style={{ textAlign: 'center' }}>Reason: {p.rejection_reason}</AppText> : null}
      </RoundedCard>
      <RoundedCard style={{ gap: 10 }}>
        {[['Shop', p.shops?.shop_name], ['Customer', p.profiles?.full_name], ['Method', p.payment_method],
          ['Type', p.payment_type === 'INDIVIDUAL' ? 'One bill' : 'Overall outstanding'], ['Declared', fmtDateTime(p.declared_at)],
          ...(receipt ? [['Receipt no.', receipt.receipt_no], ['Confirmed', fmtDateTime(receipt.verified_at)]] : [])].map(([k, v]) => (
          <View key={k as string} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText color="secondary">{k}</AppText><AppText variant="label">{v}</AppText>
          </View>
        ))}
      </RoundedCard>
      {receipt?.allocations.length ? (
        <RoundedCard style={{ gap: 8 }}>
          <AppText variant="heading">Applied to</AppText>
          {receipt.allocations.map(a => (
            <View key={a.transaction_id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText color="secondary">Bill of {fmtDate(a.bill_date)}</AppText><AppText>{formatINR(a.amount)}</AppText>
            </View>
          ))}
        </RoundedCard>
      ) : null}
    </Screen>
  );
}
