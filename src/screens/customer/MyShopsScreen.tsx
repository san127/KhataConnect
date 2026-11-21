import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { QrCode, ScanLine, Store, UserPlus } from 'lucide-react-native';
import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { SecondaryButton, PrimaryButton } from '../../components/common/Buttons';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
import { ShopCard } from '../../components/cards/ShopCard';
import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';
import { customerShopSummaries, incomingRequestsForCustomer } from '../../services/customer/customerService';

export function MyShopsScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();
  const uid = useAppStore(s => s.session?.user.id)!;
  const { data, loading, error, refreshing, reload } = useLoad(async () => {
    const [shops, requests] = await Promise.all([customerShopSummaries(), incomingRequestsForCustomer(uid)]);
    return { shops, requests };
  }, [uid]);
  useRealtime('myshops-' + uid, ['shop_customers', 'transactions', 'payments'], reload);
  const ic = (I: typeof Store) => <I size={18} color={theme.colors.text} />;
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Header back={false} title="My shops" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PrimaryButton style={{ flex: 1 }} title="Scan Shop QR" icon={<ScanLine size={18} color={theme.colors.onPrimary} />} onPress={() => nav.navigate('ScanShopQR')} />
        <SecondaryButton style={{ flex: 1 }} title="Shop code" icon={ic(QrCode)} onPress={() => nav.navigate('EnterShopCode')} />
      </View>
      {data && data.requests.length > 0 ? <SecondaryButton title={`${data.requests.length} request${data.requests.length > 1 ? 's' : ''} from shops`} icon={ic(UserPlus)} onPress={() => nav.navigate('ConnectionRequests')} /> : null}
      <SecondaryButton title="Pending & sent requests" onPress={() => nav.navigate('ConnectionRequests')} />
      {loading ? <LoadingIndicator /> : error || !data ? <ErrorState message={error ?? 'Could not load'} onRetry={reload} />
        : data.shops.length === 0 ? <EmptyState icon={<Store size={30} color={theme.colors.primary} />} title="No shops yet" message="Once a shop approves your request it appears here with your balance." />
        : data.shops.map(s => <ShopCard key={s.shop_id} shop={s} onPress={() => nav.navigate('ShopDetails', { shopId: s.shop_id, shopName: s.shop_name })} />)}
    </Screen>
  );
}
