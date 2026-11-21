// import React, { useMemo } from 'react';
// import { View } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { QrCode, ScanLine, Store } from 'lucide-react-native';
// import { Screen } from '../../components/common/Screen';
// import { AppText } from '../../components/common/AppText';
// import { RoundedCard } from '../../components/common/RoundedCard';
// import { AmountDisplay } from '../../components/common/AmountDisplay';
// import { SecondaryButton } from '../../components/common/Buttons';
// import { SectionTitle } from '../../components/common/SectionTitle';
// import { EmptyState, ErrorState, LoadingIndicator } from '../../components/common/States';
// import { SummaryTile } from '../../components/dashboard/SummaryTile';
// import { ShopCard } from '../../components/cards/ShopCard';
// import { PurchaseCard } from '../../components/cards/PurchaseCard';
// import { PaymentCard } from '../../components/cards/PaymentCard';
// import { ProfileAvatar } from '../../components/common/ProfileAvatar';
// import { useLoad } from '../../hooks/useLoad';
// import { useRealtime } from '../../hooks/useRealtime';
// import { useAppStore } from '../../store/appStore';
// import { useTheme } from '../../theme/useTheme';
// import { customerDashboard, customerShopSummaries } from '../../services/customer/customerService';
// import { listBalances } from '../../services/transaction/transactionService';
// import { listPayments } from '../../services/payment/paymentService';
// import { formatINR } from '../../utils/money';
// import { fmtDate } from '../../utils/dates';

// function greeting() {
//   const h = new Date().getHours();
//   return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
// }

// export function CustomerHomeScreen() {
//   const nav = useNavigation<any>();
//   const { theme } = useTheme();
//   const profile = useAppStore(s => s.profile);
//   const uid = useAppStore(s => s.session?.user.id)!;
//   const { data, loading, error, refreshing, reload } = useLoad(async () => {
//     const [dash, shops, balances, payments] = await Promise.all([
//       customerDashboard(), customerShopSummaries(), listBalances({ customerId: uid }), listPayments({ customerId: uid, limit: 3 }),
//     ]);
//     return { dash, shops, balances, payments };
//   }, [uid]);
//   useRealtime('cust-home-' + uid, ['transactions', 'payments', 'shop_customers'], reload);

//   const shopName = useMemo(() => Object.fromEntries((data?.shops ?? []).map(s => [s.shop_id, s.shop_name])), [data]);
//   const upcoming = useMemo(() => (data?.balances ?? []).filter(b => b.remaining_amount > 0 && b.due_date && b.transaction_status !== 'VOIDED')
//     .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)).slice(0, 3), [data]);

//   return (
//     <Screen refreshing={refreshing} onRefresh={reload}>
//       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
//         <ProfileAvatar uri={profile?.avatar_url} name={profile?.full_name} size={48} />
//         <View style={{ flex: 1 }}>
//           <AppText variant="caption" color="secondary">{greeting()}</AppText>
//           <AppText variant="title" style={{ fontSize: theme.font.size.xl }} numberOfLines={1}>{profile?.full_name?.split(' ')[0] ?? 'there'}</AppText>
//         </View>
//       </View>

//       {loading ? <LoadingIndicator /> : error || !data ? <ErrorState message={error ?? 'Could not load'} onRetry={reload} /> : (<>
//         <RoundedCard tone="mint" style={{ gap: 6, paddingVertical: 22 }}>
//           <AppText color="secondary">Total outstanding</AppText>
//           <AmountDisplay amount={data.dash.total_outstanding} size="display" />
//           <AppText variant="caption" color="secondary">across {data.dash.shop_count} {data.dash.shop_count === 1 ? 'shop' : 'shops'}</AppText>
//         </RoundedCard>
//         <View style={{ flexDirection: 'row', gap: 12 }}>
//           <SummaryTile label="Awaiting shop's check" value={String(data.dash.pending_declarations)} tone={data.dash.pending_declarations ? 'warning' : undefined} />
//           <SummaryTile label="Overdue" value={data.dash.overdue_count ? `${data.dash.overdue_count} · ${formatINR(data.dash.overdue_amount)}` : 'None'} tone={data.dash.overdue_count ? 'error' : 'success'} />
//         </View>

//         {data.shops.length === 0 ? (
//           <EmptyState icon={<Store size={30} color={theme.colors.primary} />} title="Connect your first shop" message="Scan a shop's QR code or enter its shop code to start your khata."
//             action={<View style={{ gap: 10, width: '100%' }}>
//               <SecondaryButton title="Scan shop QR" icon={<ScanLine size={18} color={theme.colors.text} />} onPress={() => nav.navigate('ScanShopQR')} />
//               <SecondaryButton title="Enter shop code" icon={<QrCode size={18} color={theme.colors.text} />} onPress={() => nav.navigate('EnterShopCode')} />
//             </View>} />
//         ) : (<>
//           <SectionTitle title="Your shops" action="See all" onAction={() => nav.navigate('CustomerTabs', { screen: 'MyShops' })} />
//           {data.shops.filter(s => s.outstanding > 0).slice(0, 4).map(s => <ShopCard key={s.shop_id} shop={s} onPress={() => nav.navigate('ShopDetails', { shopId: s.shop_id, shopName: s.shop_name })} />)}
//           {data.shops.every(s => s.outstanding <= 0) ? <RoundedCard><AppText color="success">You're all settled up. 🎉</AppText></RoundedCard> : null}
//         </>)}

//         {upcoming.length > 0 ? (<>
//           <SectionTitle title="Upcoming due dates" />
//           {upcoming.map(b => <PurchaseCard key={b.transaction_id} b={b} title={`${shopName[b.shop_id] ?? 'Shop'} · due ${fmtDate(b.due_date)}`} onPress={() => nav.navigate('PurchaseDetails', { id: b.transaction_id })} />)}
//         </>) : null}
//         {data.balances.length > 0 ? (<>
//           <SectionTitle title="Recent purchases" />
//           {data.balances.slice(0, 3).map(b => <PurchaseCard key={b.transaction_id} b={b} title={shopName[b.shop_id] ?? 'Purchase'} onPress={() => nav.navigate('PurchaseDetails', { id: b.transaction_id })} />)}
//         </>) : null}
//         {data.payments.length > 0 ? (<>
//           <SectionTitle title="Recent payments" action="History" onAction={() => nav.navigate('CustomerTabs', { screen: 'Payments' })} />
//           {data.payments.map(p => <PaymentCard key={p.id} p={p} who="customer" onPress={() => nav.navigate('PaymentDetails', { id: p.id })} />)}
//         </>) : null}
//       </>)}
//     </Screen>
//   );
// }



import React, { useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { QrCode, ScanLine, Store } from 'lucide-react-native';

import { Screen } from '../../components/common/Screen';
import { AppText } from '../../components/common/AppText';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { SecondaryButton } from '../../components/common/Buttons';
import { SectionTitle } from '../../components/common/SectionTitle';
import {
  EmptyState,
  ErrorState,
  LoadingIndicator,
} from '../../components/common/States';

import { SummaryTile } from '../../components/dashboard/SummaryTile';
import { ShopCard } from '../../components/cards/ShopCard';
import { PurchaseCard } from '../../components/cards/PurchaseCard';
import { PaymentCard } from '../../components/cards/PaymentCard';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';

import { useLoad } from '../../hooks/useLoad';
import { useRealtime } from '../../hooks/useRealtime';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';

import {
  customerDashboard,
  customerShopSummaries,
} from '../../services/customer/customerService';

import { listBalances } from '../../services/transaction/transactionService';
import { listPayments } from '../../services/payment/paymentService';

import { formatINR } from '../../utils/money';
import { fmtDate } from '../../utils/dates';

function greeting() {
  const h = new Date().getHours();

  return h < 12
    ? 'Good morning'
    : h < 17
    ? 'Good afternoon'
    : 'Good evening';
}

export function CustomerHomeScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();

  const profile = useAppStore(s => s.profile);
  const uid = useAppStore(s => s.session?.user.id)!;

  const {
    data,
    loading,
    error,
    refreshing,
    reload,
  } = useLoad(async () => {
    const [dash, shops, balances, payments] = await Promise.all([
      customerDashboard(),
      customerShopSummaries(),
      listBalances({ customerId: uid }),
      listPayments({ customerId: uid, limit: 3 }),
    ]);

    return {
      dash,
      shops,
      balances,
      payments,
    };
  }, [uid]);

  useRealtime(
    'cust-home-' + uid,
    ['transactions', 'payments', 'shop_customers'],
    reload
  );

  const shopName = useMemo(
    () =>
      Object.fromEntries(
        (data?.shops ?? []).map(s => [s.shop_id, s.shop_name])
      ),
    [data]
  );

  const upcoming = useMemo(
    () =>
      (data?.balances ?? [])
        .filter(
          b =>
            b.remaining_amount > 0 &&
            b.due_date &&
            b.transaction_status !== 'VOIDED'
        )
        .sort((a, b) =>
          a.due_date! < b.due_date! ? -1 : 1
        )
        .slice(0, 3),
    [data]
  );

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>

      {/* Clickable profile header */}
      <Pressable
        onPress={() => nav.navigate('Profile')}
        android_ripple={{
          color: theme.colors.border,
          borderless: false,
        }}
        accessibilityRole="button"
        accessibilityLabel="Open your profile"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 4,
          borderRadius: 12,
        }}
      >
        <ProfileAvatar
          uri={profile?.avatar_url}
          name={profile?.full_name}
          size={48}
        />

        <View style={{ flex: 1 }}>
          <AppText variant="caption" color="secondary">
            {greeting()}
          </AppText>

          <AppText
            variant="title"
            style={{ fontSize: theme.font.size.xl }}
            numberOfLines={1}
          >
            {profile?.full_name?.split(' ')[0] ?? 'there'}
          </AppText>
        </View>
      </Pressable>

      {loading ? (
        <LoadingIndicator />
      ) : error || !data ? (
        <ErrorState
          message={error ?? 'Could not load'}
          onRetry={reload}
        />
      ) : (
        <>
          {/* Outstanding amount */}
          
<Pressable
  onPress={() =>
    nav.navigate('CustomerTabs', {
      screen: 'MyShops',
    })
  }
  accessibilityRole="button"
  accessibilityLabel={`Total outstanding ${formatINR(data.dash.total_outstanding)}. View unpaid dues`}
>
  <RoundedCard
    tone="mint"
    style={{ gap: 6, paddingVertical: 22 }}
  >
    <AppText color="secondary">
      Total outstanding
    </AppText>

    <AmountDisplay
      amount={data.dash.total_outstanding}
      size="display"
    />

    <AppText variant="caption" color="secondary">
      across {data.dash.shop_count}{' '}
      {data.dash.shop_count === 1 ? 'shop' : 'shops'}
    </AppText>

    <AppText
      variant="caption"
      color="secondary"
      style={{ marginTop: 4 }}
    >
      Tap to view all unpaid dues →
    </AppText>
  </RoundedCard>
</Pressable>


          {/* Summary tiles */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
            }}
          >
            <SummaryTile
              label="Awaiting shop's check"
              value={String(data.dash.pending_declarations)}
              tone={
                data.dash.pending_declarations
                  ? 'warning'
                  : undefined
              }
            />

            <SummaryTile
              label="Overdue"
              value={
                data.dash.overdue_count
                  ? `${data.dash.overdue_count} · ${formatINR(
                      data.dash.overdue_amount
                    )}`
                  : 'None'
              }
              tone={
                data.dash.overdue_count
                  ? 'error'
                  : 'success'
              }
            />
          </View>

          {/* Shops */}
          {data.shops.length === 0 ? (
            <EmptyState
              icon={
                <Store
                  size={30}
                  color={theme.colors.primary}
                />
              }
              title="Connect your first shop"
              message="Scan a shop's QR code or enter its shop code to start your khata."
              action={
                <View style={{ gap: 10, width: '100%' }}>
                  <SecondaryButton
                    title="Scan shop QR"
                    icon={
                      <ScanLine
                        size={18}
                        color={theme.colors.text}
                      />
                    }
                    onPress={() => nav.navigate('ScanShopQR')}
                  />

                  <SecondaryButton
                    title="Enter shop code"
                    icon={
                      <QrCode
                        size={18}
                        color={theme.colors.text}
                      />
                    }
                    onPress={() => nav.navigate('EnterShopCode')}
                  />
                </View>
              }
            />
          ) : (
            <>
              <SectionTitle
                title="Your shops"
                action="See all"
                onAction={() =>
                  nav.navigate('CustomerTabs', {
                    screen: 'MyShops',
                  })
                }
              />

              {data.shops
                .filter(s => s.outstanding > 0)
                .slice(0, 4)
                .map(s => (
                  <ShopCard
                    key={s.shop_id}
                    shop={s}
                    onPress={() =>
                      nav.navigate('ShopDetails', {
                        shopId: s.shop_id,
                        shopName: s.shop_name,
                      })
                    }
                  />
                ))}

              {data.shops.every(s => s.outstanding <= 0) ? (
                <RoundedCard>
                  <AppText color="success">
                    You're all settled up. 🎉
                  </AppText>
                </RoundedCard>
              ) : null}
            </>
          )}

          {/* Upcoming due dates */}
          {upcoming.length > 0 && (
            <>
              <SectionTitle title="Upcoming due dates" />

              {upcoming.map(b => (
                <PurchaseCard
                  key={b.transaction_id}
                  b={b}
                  title={`${shopName[b.shop_id] ?? 'Shop'} · due ${fmtDate(
                    b.due_date
                  )}`}
                  onPress={() =>
                    nav.navigate('PurchaseDetails', {
                      id: b.transaction_id,
                    })
                  }
                />
              ))}
            </>
          )}

          {/* Recent purchases */}
          {data.balances.length > 0 && (
            <>
              <SectionTitle title="Recent purchases" />

              {data.balances.slice(0, 3).map(b => (
                <PurchaseCard
                  key={b.transaction_id}
                  b={b}
                  title={shopName[b.shop_id] ?? 'Purchase'}
                  onPress={() =>
                    nav.navigate('PurchaseDetails', {
                      id: b.transaction_id,
                    })
                  }
                />
              ))}
            </>
          )}

          {/* Recent payments */}
          {data.payments.length > 0 && (
            <>
              <SectionTitle
                title="Recent payments"
                action="History"
                onAction={() =>
                  nav.navigate('CustomerTabs', {
                    screen: 'Payments',
                  })
                }
              />

              {data.payments.map(p => (
                <PaymentCard
                  key={p.id}
                  p={p}
                  who="customer"
                  onPress={() =>
                    nav.navigate('PaymentDetails', {
                      id: p.id,
                    })
                  }
                />
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
