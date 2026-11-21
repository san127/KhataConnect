import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScanLine, Users } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { Chips } from '../../components/common/Chips';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { CustomerCard } from '../../components/cards/CustomerCard';
import { ShopOnboarding } from './ShopOnboarding';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { shopCustomerSummaries, incomingRequestsForShop } from '../../services/customer/customerService';

type F = 'all' | 'owing' | 'overdue' | 'verify';
export function CustomersScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const shop = useAppStore(s => s.selectedShop());
  const [q, setQ] = useState('');
  const [f, setF] = useState<F>('all');
  const { data, loading, error, reload, refreshing } = useLoad(async () => {
    if (!shop) return null;
    const [customers, reqs] = await Promise.all([shopCustomerSummaries(shop.id), incomingRequestsForShop(shop.id)]);
    return { customers, reqs: reqs.length };
  }, [shop?.id]);
  useRealtime('shopcust-' + shop?.id, ['shop_customers', 'transactions', 'payments'], reload);
  const rows = useMemo(() => (data?.customers ?? []).filter(c => {
    if (f === 'owing' && c.outstanding <= 0) return false;
    if (f === 'overdue' && c.overdue_count === 0) return false;
    if (f === 'verify' && c.pending_declarations === 0) return false;
    return !q.trim() || c.full_name.toLowerCase().includes(q.trim().toLowerCase()) || (c.phone ?? '').includes(q.trim());
  }), [data, q, f]);
  if (!shop) return <ShopOnboarding />;
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header back={false} title="Customers" subtitle={shop.shop_name} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PrimaryButton style={{ flex: 1 }} title="Scan customer" icon={<ScanLine size={18} color={theme.colors.onPrimary} />} onPress={() => nav.navigate('CustomerScanner')} />
        <SecondaryButton style={{ flex: 1 }} title={data?.reqs ? `Requests (${data.reqs})` : 'Requests'} onPress={() => nav.navigate('ShopConnectionRequests')} />
      </View>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search name or phone" />
      <Chips value={f} onChange={setF} options={[{ key: 'all', label: 'All' }, { key: 'owing', label: 'Owing' }, { key: 'overdue', label: 'Overdue' }, { key: 'verify', label: 'To verify' }]} />
      {loading ? <LoadingIndicator /> : error ? <ErrorState message={error} onRetry={reload} />
        : rows.length === 0 ? <EmptyState icon={<Users size={30} color={theme.colors.primary} />} title="No customers" message="Scan a customer's QR or share your shop code so they can connect." />
        : rows.map(c => <CustomerCard key={c.customer_id} c={c} onPress={() => nav.navigate('CustomerDetails', { customerId: c.customer_id, name: c.full_name })} />)}
    </Screen>
  );
}
