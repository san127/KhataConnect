import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Receipt, Plus } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { Chips } from '../../components/common/Chips';
import { PrimaryButton } from '../../components/common/Buttons';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { PurchaseCard } from '../../components/cards/PurchaseCard';
import { ShopOnboarding } from './ShopOnboarding';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { listBalances } from '../../services/transaction/transactionService';
import { shopCustomerSummaries } from '../../services/customer/customerService';
import { fmtDate } from '../../utils/dates';

type F = 'all' | 'unpaid' | '30' | 'disputed';
export function TransactionsScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const shop = useAppStore(s => s.selectedShop());
  const [q, setQ] = useState('');
  const [f, setF] = useState<F>('all');
  const { data, loading, error, reload, refreshing } = useLoad(async () => {
    if (!shop) return null;
    const [balances, customers] = await Promise.all([listBalances({ shopId: shop.id }), shopCustomerSummaries(shop.id)]);
    return { balances, names: Object.fromEntries(customers.map(c => [c.customer_id, c.full_name])) as Record<string, string> };
  }, [shop?.id]);
  useRealtime('shoptx-' + shop?.id, ['transactions', 'payments'], reload);
  const rows = useMemo(() => (data?.balances ?? []).filter(b => {
    if (f === 'unpaid' && !(b.remaining_amount > 0 && b.transaction_status !== 'VOIDED')) return false;
    if (f === 'disputed' && b.transaction_status !== 'DISPUTED') return false;
    if (f === '30' && Date.now() - new Date(b.created_at).getTime() > 30 * 86400000) return false;
    const t = q.trim().toLowerCase();
    const name = (data?.names[b.customer_id] ?? '').toLowerCase();
    return !t || name.includes(t) || b.transaction_id.toLowerCase().startsWith(t) || fmtDate(b.created_at).toLowerCase().includes(t);
  }), [data, q, f]);
  if (!shop) return <ShopOnboarding />;
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header back={false} title="Transactions" subtitle={shop.shop_name} />
      <PrimaryButton title="Add udhaar" icon={<Plus size={18} color={theme.colors.onPrimary} />} onPress={() => nav.navigate('AddPurchase')} />
      <SearchBar value={q} onChangeText={setQ} placeholder="Search customer, bill no. or date" />
      <Chips value={f} onChange={setF} options={[{ key: 'all', label: 'All' }, { key: 'unpaid', label: 'Unpaid' }, { key: '30', label: 'Last 30 days' }, { key: 'disputed', label: 'Disputed' }]} />
      {loading ? <LoadingIndicator /> : error ? <ErrorState message={error} onRetry={reload} />
        : rows.length === 0 ? <EmptyState icon={<Receipt size={30} color={theme.colors.primary} />} title="No transactions" message="Bills you add will show up here." />
        : rows.map(b => <PurchaseCard key={b.transaction_id} b={b} title={data?.names[b.customer_id] ?? 'Customer'} onPress={() => nav.navigate('PurchaseDetails', { id: b.transaction_id })} />)}
    </Screen>
  );
}
