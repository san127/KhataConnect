import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ClipboardList, ScanLine, UserPlus } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { AppText } from '../../components/common/AppText';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { SectionTitle } from '../../components/common/SectionTitle';
import { ErrorState, LoadingIndicator } from '../../components/common/States';
import { SummaryTile } from '../../components/dashboard/SummaryTile';
import { PurchaseCard } from '../../components/cards/PurchaseCard';
import { ShopImageHeader } from '../../components/shop/ShopImageHeader';
import { ShopOnboarding } from './ShopOnboarding';
import { NotificationBell } from '../../components/common/NotificationBell';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { shopDashboard } from '../../services/payment/paymentService';
import { listBalances } from '../../services/transaction/transactionService';
import { incomingRequestsForShop } from '../../services/customer/customerService';
import { formatINR } from '../../utils/money';

export function ShopDashboardScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const shop = useAppStore(s => s.selectedShop());
  const { data, loading, error, reload, refreshing } = useLoad(async () => {
    if (!shop) return null;
    const [d, recent, reqs] = await Promise.all([shopDashboard(shop.id), listBalances({ shopId: shop.id }), incomingRequestsForShop(shop.id)]);
    return { d, recent: recent.slice(0, 5), reqs: reqs.length };
  }, [shop?.id]);
  useRealtime('shopdash-' + shop?.id, ['transactions', 'payments', 'shop_customers'], reload);
  if (!shop) return <ShopOnboarding />;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="heading">Dashboard</AppText><NotificationBell />
      </View>
      <ShopImageHeader cover={shop.cover_image_url} logo={shop.profile_image_url} name={shop.shop_name} subtitle={shop.shop_code} />
      {loading ? <LoadingIndicator /> : error || !data ? <ErrorState message={error ?? ''} onRetry={reload} /> : (<>
        <RoundedCard tone="mint" style={{ gap: 6, paddingVertical: 22 }}>
          <AppText color="secondary">Total outstanding</AppText>
          <AmountDisplay amount={data.d.total_outstanding} size="display" />
          <AppText variant="caption" color="secondary">{data.d.unpaid_count} unpaid bills · {data.d.customer_count} customers</AppText>
        </RoundedCard>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <SummaryTile label="Collected today" value={formatINR(data.d.collected_today)} tone="success" />
          <SummaryTile label="This month" value={formatINR(data.d.collected_month)} tone="success" />
          <SummaryTile label="To verify" value={String(data.d.pending_verifications)} tone={data.d.pending_verifications ? 'warning' : undefined} />
          <SummaryTile label="Overdue" value={formatINR(data.d.overdue_amount)} tone={data.d.overdue_amount ? 'error' : undefined} />
        </View>
        {data.d.pending_verifications > 0 ? <PrimaryButton title={`Verify ${data.d.pending_verifications} payment${data.d.pending_verifications > 1 ? 's' : ''}`} onPress={() => nav.navigate('ShopTabs', { screen: 'Payments' })} /> : null}
        {data.reqs > 0 ? <SecondaryButton title={`${data.reqs} customer request${data.reqs > 1 ? 's' : ''}`} icon={<UserPlus size={18} color={theme.colors.text} />} onPress={() => nav.navigate('ShopConnectionRequests')} /> : null}
        <SectionTitle title="Quick actions" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <PrimaryButton style={{ flex: 1 }} title="Add udhaar" icon={<ClipboardList size={18} color={theme.colors.onPrimary} />} onPress={() => nav.navigate('AddPurchase')} />
          <SecondaryButton style={{ flex: 1 }} title="Add customer" icon={<ScanLine size={18} color={theme.colors.text} />} onPress={() => nav.navigate('CustomerScanner')} />
        </View>
        {data.recent.length > 0 ? (<>
          <SectionTitle title="Recent transactions" action="See all" onAction={() => nav.navigate('ShopTabs', { screen: 'Transactions' })} />
          {data.recent.map(b => <PurchaseCard key={b.transaction_id} b={b} onPress={() => nav.navigate('PurchaseDetails', { id: b.transaction_id })} />)}
        </>) : null}
      </>)}
    </Screen>
  );
}
