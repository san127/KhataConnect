import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Wallet } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { Chips } from '../../components/common/Chips';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { PaymentCard } from '../../components/cards/PaymentCard';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { listPayments } from '../../services/payment/paymentService';
import type { PaymentStatus } from '../../types/models';

export function CustomerPaymentsScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const uid = useAppStore(s => s.session?.user.id)!;
  const [f, setF] = useState<'ALL' | PaymentStatus>('ALL');
  const { data, loading, error, reload, refreshing } = useLoad(() => listPayments({ customerId: uid }), [uid]);
  useRealtime('custpay-' + uid, ['payments'], reload);
  const rows = (data ?? []).filter(p => f === 'ALL' || p.verification_status === f);
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header back={false} title="Payments" />
      <Chips value={f} onChange={setF} options={[{ key: 'ALL', label: 'All' }, { key: 'PENDING', label: 'Awaiting' }, { key: 'RECEIVED', label: 'Received' }, { key: 'REJECTED', label: 'Rejected' }]} />
      {loading ? <LoadingIndicator /> : error ? <ErrorState message={error} onRetry={reload} />
        : rows.length === 0 ? <EmptyState icon={<Wallet size={30} color={theme.colors.primary} />} title="No payments" message="Open a shop and tap Pay outstanding after you pay by UPI or cash." />
        : rows.map(p => <PaymentCard key={p.id} p={p} who="customer" onPress={() => nav.navigate('PaymentDetails', { id: p.id })} />)}
    </Screen>
  );
}
