import React, { useState } from 'react';
import { View } from 'react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { Chips } from '../../components/common/Chips';
import { SectionTitle } from '../../components/common/SectionTitle';
import { ErrorState, LoadingIndicator } from '../../components/common/States';
import { SummaryTile } from '../../components/dashboard/SummaryTile';
import { useLoad } from '../../hooks/useLoad';
import { useAppStore } from '../../store/appStore';
import { shopReport, shopDashboard } from '../../services/payment/paymentService';
import { addDays, fmtDate, toISODate } from '../../utils/dates';
import { formatINR } from '../../utils/money';
import { REPORT_RANGES } from '../../constants/categories';

export function ReportsScreen() {
  const shopId = useAppStore(s => s.selectedShopId)!;
  const [range, setRange] = useState<'7' | '30' | 'month'>('7');
  const { data, loading, error, reload } = useLoad(async () => {
    const now = new Date();
    const from = range === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : addDays(now, -(Number(range) - 1));
    const [report, dash] = await Promise.all([shopReport(shopId, toISODate(from), toISODate(now)), shopDashboard(shopId)]);
    return { report, dash };
  }, [shopId, range]);
  const max = Math.max(1, ...(data?.report.daily.map(d => d.amount) ?? [1]));
  return (
    <Screen>
      <Header title="Financial reports" />
      <Chips value={range} onChange={setRange} options={REPORT_RANGES.map(r => ({ key: r.key, label: r.label }))} />
      {loading ? <LoadingIndicator /> : error || !data ? <ErrorState message={error ?? ''} onRetry={reload} /> : (<>
        <RoundedCard tone="mint" style={{ gap: 6 }}>
          <AppText color="secondary">Collected in this period</AppText>
          <AmountDisplay amount={data.report.collected_upi + data.report.collected_cash} size="display" color="success" />
        </RoundedCard>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <SummaryTile label="Via UPI" value={formatINR(data.report.collected_upi)} />
          <SummaryTile label="Via cash" value={formatINR(data.report.collected_cash)} />
          <SummaryTile label="Credit given" value={formatINR(data.report.credit_given)} tone="warning" />
          <SummaryTile label="Outstanding now" value={formatINR(data.dash.total_outstanding)} />
        </View>
        <SectionTitle title="Daily collections" />
        <RoundedCard style={{ gap: 10 }}>
          {data.report.daily.length === 0 ? <AppText color="secondary">No verified payments in this period.</AppText> : data.report.daily.map(d => (
            <View key={d.day} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="caption" color="secondary">{fmtDate(d.day)}</AppText><AppText variant="label">{formatINR(d.amount)}</AppText></View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: 'transparent' }}><View style={{ height: 8, borderRadius: 4, width: `${Math.max(4, (d.amount / max) * 100)}%`, backgroundColor: '#78977A' }} /></View>
            </View>
          ))}
        </RoundedCard>
      </>)}
    </Screen>
  );
}
