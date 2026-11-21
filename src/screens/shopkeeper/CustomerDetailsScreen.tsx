import React from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { PrimaryButton } from '../../components/common/Buttons';
import { SectionTitle } from '../../components/common/SectionTitle';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { PurchaseCard } from '../../components/cards/PurchaseCard';
import { PaymentCard } from '../../components/cards/PaymentCard';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { shopCustomerSummaries } from '../../services/customer/customerService';
import { listBalances } from '../../services/transaction/transactionService';
import { listPayments } from '../../services/payment/paymentService';

export function CustomerDetailsScreen() {
  const nav = useNavigation<any>();
  const { customerId, name } = useRoute<any>().params as { customerId: string; name: string };
  const shopId = useAppStore(s => s.selectedShopId)!;
  const { data, loading, error, reload, refreshing } = useLoad(async () => {
    const [sums, balances, payments] = await Promise.all([shopCustomerSummaries(shopId), listBalances({ shopId, customerId }), listPayments({ shopId, customerId })]);
    return { summary: sums.find(s => s.customer_id === customerId), balances, payments };
  }, [shopId, customerId]);
  useRealtime('custdet-' + customerId, ['transactions', 'payments'], reload);
  if (loading) return <Screen><Header title={name} /><LoadingIndicator /></Screen>;
  if (error || !data) return <Screen><Header title={name} /><ErrorState message={error ?? ''} onRetry={reload} /></Screen>;
  const s = data.summary;
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header title={name} />
      <RoundedCard tone="mint" style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <ProfileAvatar name={name} size={52} />
          <View style={{ flex: 1 }}><AppText variant="heading">{name}</AppText><AppText color="secondary">{s?.phone ?? 'No phone shared'}</AppText></View>
        </View>
        <AppText color="secondary">Outstanding</AppText>
        <AmountDisplay amount={s?.outstanding ?? 0} size="display" />
        <PrimaryButton title="Add udhaar" onPress={() => nav.navigate('AddPurchase', { customerId, customerName: name })} />
      </RoundedCard>
      {data.payments.some(p => p.verification_status === 'PENDING') ? (<>
        <SectionTitle title="Awaiting your verification" />
        {data.payments.filter(p => p.verification_status === 'PENDING').map(p => <PaymentCard key={p.id} p={p} who="shop" onPress={() => nav.navigate('PaymentVerification', { id: p.id })} />)}
      </>) : null}
      <SectionTitle title="Purchases" />
      {data.balances.length === 0 ? <EmptyState title="No purchases yet" /> : data.balances.map(b => <PurchaseCard key={b.transaction_id} b={b} onPress={() => nav.navigate('PurchaseDetails', { id: b.transaction_id })} />)}
      <SectionTitle title="Payments" />
      {data.payments.filter(p => p.verification_status !== 'PENDING').map(p => <PaymentCard key={p.id} p={p} who="shop" onPress={() => nav.navigate('PaymentDetails', { id: p.id })} />)}
    </Screen>
  );
}
