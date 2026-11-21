import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { ShieldCheck } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { useLoad } from '../../hooks/useLoad';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { listDisputes } from '../../services/transaction/transactionService';
import { fmtDate } from '../../utils/dates';

/** Used by both roles: customers see their disputes, shopkeepers see disputes for the selected shop. */
export function DisputesScreen({ shopMode }: { shopMode?: boolean }) {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const uid = useAppStore(s => s.session?.user.id)!;
  const shopId = useAppStore(s => s.selectedShopId);
  const { data, loading, error, reload, refreshing } = useLoad(() => listDisputes(shopMode ? { shopId: shopId! } : { customerId: uid }), [shopMode, shopId, uid]);
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header title="Disputes" />
      {loading ? <LoadingIndicator /> : error ? <ErrorState message={error} onRetry={reload} />
        : !data?.length ? <EmptyState icon={<ShieldCheck size={30} color={theme.colors.primary} />} title="No disputes" message="Raised disputes and their outcome appear here." />
        : data.map(d => (
          <RoundedCard key={d.id} onPress={() => nav.navigate('PurchaseDetails', { id: d.transaction_id })} style={{ gap: 6 }}>
            <AppText variant="heading">{shopMode ? d.profiles?.full_name : d.shops?.shop_name}</AppText>
            <AppText>{d.dispute_reason}</AppText>
            <AppText variant="caption" color="secondary">{fmtDate(d.created_at)}</AppText>
            <StatusBadge label={d.dispute_status === 'OPEN' ? 'Open' : d.dispute_status === 'RESOLVED_VOIDED' ? 'Purchase cancelled' : 'Purchase kept'} tone={d.dispute_status === 'OPEN' ? 'warning' : 'neutral'} />
          </RoundedCard>
        ))}
    </Screen>
  );
}
