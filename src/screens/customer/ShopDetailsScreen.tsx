import React, { useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { PrimaryButton } from '../../components/common/Buttons';
import { SearchBar } from '../../components/common/SearchBar';
import { Chips } from '../../components/common/Chips';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { PurchaseCard } from '../../components/cards/PurchaseCard';
import { ShopImageHeader } from '../../components/shop/ShopImageHeader';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { supabase } from '../../services/supabase/client';
import { listBalances } from '../../services/transaction/transactionService';
import { fmtDate } from '../../utils/dates';
import { Receipt } from 'lucide-react-native';
import { useTheme } from '../../theme/useTheme';

type Range = 'all' | '30' | '90' | 'unpaid';

/** Customer's ledger for one shop: purchases with search + date filter. */
export function ShopDetailsScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const { shopId, shopName } = useRoute<any>().params as { shopId: string; shopName: string };
  const uid = useAppStore(s => s.session?.user.id)!;
  const [q, setQ] = useState('');
  const [range, setRange] = useState<Range>('all');
  const { data, loading, error, reload, refreshing } = useLoad(async () => {
    const [{ data: shop }, balances] = await Promise.all([
      supabase.from('shops').select('id, shop_name, category, shop_code, address, profile_image_url, cover_image_url, upi_qr_url').eq('id', shopId).single(),
      listBalances({ shopId, customerId: uid }),
    ]);
    return { shop, balances };
  }, [shopId, uid]);
  useRealtime('shopdet-' + shopId, ['transactions', 'payments'], reload);

  const outstanding = useMemo(() => (data?.balances ?? []).filter(b => b.transaction_status !== 'VOIDED').reduce((s, b) => s + Math.max(b.remaining_amount, 0), 0), [data]);
  const filtered = useMemo(() => {
    const now = Date.now();
    return (data?.balances ?? []).filter(b => {
      if (range === 'unpaid' && !(b.remaining_amount > 0 && b.transaction_status !== 'VOIDED')) return false;
      if ((range === '30' || range === '90') && now - new Date(b.created_at).getTime() > Number(range) * 86400000) return false;
      const t = q.trim().toLowerCase();
      return !t || b.transaction_id.toLowerCase().startsWith(t) || fmtDate(b.created_at).toLowerCase().includes(t) || String(b.total_amount).includes(t);
    });
  }, [data, q, range]);

  if (loading) return <Screen><Header title={shopName} /><LoadingIndicator /></Screen>;
  if (error || !data?.shop) return <Screen><Header title={shopName} /><ErrorState message={error ?? 'Shop unavailable'} onRetry={reload} /></Screen>;
  const s = data.shop;
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header title={s.shop_name} />
      <ShopImageHeader cover={s.cover_image_url} logo={s.profile_image_url} name={s.shop_name} subtitle={[s.category, s.shop_code].filter(Boolean).join(' · ')} />
      <RoundedCard tone="mint" style={{ gap: 6 }}>
        <AppText color="secondary">You owe</AppText>
        <AmountDisplay amount={outstanding} size="display" color={outstanding > 0 ? undefined : 'success'} />
        {outstanding > 0 ? <PrimaryButton title="Pay outstanding" style={{ marginTop: 10 }} onPress={() => nav.navigate('PaymentDeclaration', { shopId, shopName: s.shop_name, shopUpiPath: s.upi_qr_url })} /> : null}
      </RoundedCard>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search by bill no., date or amount" />
      <Chips value={range} onChange={setRange} options={[{ key: 'all', label: 'All' }, { key: 'unpaid', label: 'Unpaid' }, { key: '30', label: 'Last 30 days' }, { key: '90', label: 'Last 90 days' }]} />
      {filtered.length === 0 ? <EmptyState icon={<Receipt size={30} color={theme.colors.primary} />} title="No purchases" message="Purchases added by the shop will appear here." />
        : filtered.map(b => <PurchaseCard key={b.transaction_id} b={b} onPress={() => nav.navigate('PurchaseDetails', { id: b.transaction_id })} />)}
    </Screen>
  );
}
