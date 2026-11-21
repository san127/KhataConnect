import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { PrimaryButton, SecondaryButton } from '../../components/common/Buttons';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SectionTitle } from '../../components/common/SectionTitle';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { incomingRequestsForCustomer, outgoingRequestsForCustomer, respondConnection } from '../../services/customer/customerService';
import { friendlyError } from '../../utils/errors';
import { fmtDate } from '../../utils/dates';

export function ConnectionRequestsScreen() {
  const uid = useAppStore(s => s.session?.user.id)!;
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, error, reload, refreshing } = useLoad(async () => ({
    incoming: await incomingRequestsForCustomer(uid), outgoing: await outgoingRequestsForCustomer(uid),
  }), [uid]);
  useRealtime('creq-' + uid, ['shop_customers'], reload);
  const respond = async (id: string, ok: boolean) => {
    setBusy(id);
    try { await respondConnection(id, ok); await reload(); } catch (e) { Alert.alert('Could not update', friendlyError(e)); } finally { setBusy(null); }
  };
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header title="Connection requests" />
      {loading ? <LoadingIndicator /> : error || !data ? <ErrorState message={error ?? ''} onRetry={reload} /> : (<>
        <SectionTitle title="Shops asking to add you" />
        {data.incoming.length === 0 ? <EmptyState title="No requests" message="When a shop scans your QR it will appear here." /> : data.incoming.map(r => (
          <RoundedCard key={r.id} style={{ gap: 12 }}>
            <AppText variant="heading">{r.shops?.shop_name}</AppText>
            <AppText color="secondary">{r.shops?.category ?? 'Shop'} · {r.shops?.shop_code} · {fmtDate(r.created_at)}</AppText>
            <AppText variant="caption" color="secondary">Approving lets this shop add purchases to your khata and see your payments to them.</AppText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PrimaryButton style={{ flex: 1 }} title="Approve" loading={busy === r.id} onPress={() => respond(r.id, true)} />
              <SecondaryButton style={{ flex: 1 }} title="Decline" tone="danger" disabled={busy === r.id} onPress={() => respond(r.id, false)} />
            </View>
          </RoundedCard>
        ))}
        <SectionTitle title="Requests you sent" />
        {data.outgoing.length === 0 ? <AppText color="secondary">Nothing waiting.</AppText> : data.outgoing.map(r => (
          <RoundedCard key={r.id} style={{ gap: 6 }}>
            <AppText variant="heading">{r.shops?.shop_name}</AppText>
            <StatusBadge label="Waiting for shop to approve" tone="warning" />
          </RoundedCard>
        ))}
      </>)}
    </Screen>
  );
}
