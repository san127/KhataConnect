import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { incomingRequestsForShop, respondConnection } from '../../services/customer/customerService';
import { friendlyError } from '../../utils/errors';
import { fmtDate } from '../../utils/dates';

export function ShopConnectionRequestsScreen() {
  const shopId = useAppStore(s => s.selectedShopId)!;
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, error, reload, refreshing } = useLoad(() => incomingRequestsForShop(shopId), [shopId]);
  useRealtime('shopreq-' + shopId, ['shop_customers'], reload);
  const respond = async (id: string, ok: boolean) => {
    setBusy(id);
    try { await respondConnection(id, ok); await reload(); } catch (e) { Alert.alert('Could not update', friendlyError(e)); } finally { setBusy(null); }
  };
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header title="Connection requests" />
      {loading ? <LoadingIndicator /> : error ? <ErrorState message={error} onRetry={reload} />
        : !data?.length ? <EmptyState title="No pending requests" message="Customers who scan your QR or enter your shop code appear here." />
        : data.map(r => (
          <RoundedCard key={r.id} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ProfileAvatar name={r.profiles?.full_name} size={48} />
              <View style={{ flex: 1 }}><AppText variant="heading">{r.profiles?.full_name}</AppText><AppText variant="caption" color="secondary">Requested {fmtDate(r.created_at)}</AppText></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PrimaryButton style={{ flex: 1 }} title="Approve" loading={busy === r.id} onPress={() => respond(r.id, true)} />
              <SecondaryButton style={{ flex: 1 }} title="Reject" tone="danger" disabled={busy === r.id} onPress={() => respond(r.id, false)} />
            </View>
          </RoundedCard>
        ))}
    </Screen>
  );
}
