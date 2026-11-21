import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Wallet } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { Chips } from '../../components/common/Chips';
import { SectionTitle } from '../../components/common/SectionTitle';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { PaymentCard } from '../../components/cards/PaymentCard';
import { ShopOnboarding } from './ShopOnboarding';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { listPayments } from '../../services/payment/paymentService';

export function ShopPaymentsScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const shop = useAppStore(s => s.selectedShop());
  const [f, setF] = useState<'ALL' | 'RECEIVED' | 'REJECTED'>('ALL');
  const { data, loading, error, reload, refreshing } = useLoad(async () => (shop ? listPayments({ shopId: shop.id }) : []), [shop?.id]);
  useRealtime('shoppay-' + shop?.id, ['payments'], reload);
  if (!shop) return <ShopOnboarding />;
  const pending = (data ?? []).filter(p => p.verification_status === 'PENDING');
  const history = (data ?? []).filter(p => p.verification_status !== 'PENDING' && (f === 'ALL' || p.verification_status === f));
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header back={false} title="Payments" subtitle={shop.shop_name} />
      {loading ? <LoadingIndicator /> : error ? <ErrorState message={error} onRetry={reload} /> : (<>
        <SectionTitle title={`Awaiting verification (${pending.length})`} />
        {pending.length === 0 ? <EmptyState icon={<Wallet size={30} color={theme.colors.primary} />} title="Nothing to verify" message="Declared UPI and cash payments will wait here for you to confirm." />
          : pending.map(p => <PaymentCard key={p.id} p={p} who="shop" onPress={() => nav.navigate('PaymentVerification', { id: p.id })} />)}
        <SectionTitle title="History" />
        <Chips value={f} onChange={setF} options={[{ key: 'ALL', label: 'All' }, { key: 'RECEIVED', label: 'Received' }, { key: 'REJECTED', label: 'Rejected' }]} />
        {history.map(p => <PaymentCard key={p.id} p={p} who="shop" onPress={() => nav.navigate('PaymentDetails', { id: p.id })} />)}
      </>)}
    </Screen>
  );
}
