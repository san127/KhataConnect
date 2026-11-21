// import React, { useRef, useState } from 'react';
// import { Alert, Image, Pressable, View } from 'react-native';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import { Banknote, QrCode } from 'lucide-react-native';
// import { Screen } from '../../components/common/Screen';
// import { Header } from '../../components/common/Header';
// import { RoundedCard } from '../../components/common/RoundedCard';
// import { AppText } from '../../components/common/AppText';
// import { AppInput } from '../../components/common/AppInput';
// import { PrimaryButton } from '../../components/common/Buttons';
// import { AmountDisplay } from '../../components/common/AmountDisplay';
// import { ErrorState, LoadingIndicator } from '../../components/common/States';
// import { useLoad } from '../../hooks/useLoad';
// import { useAppStore } from '../../store/appStore';
// import { useTheme } from '../../theme/useTheme';
// import { supabase } from '../../services/supabase/client';
// import { signedUpiUrl } from '../../services/shop/shopService';
// import { listBalances } from '../../services/transaction/transactionService';
// import { declarePayment, listPayments } from '../../services/payment/paymentService';
// import { amountSchema } from '../../utils/validation';
// import { friendlyError } from '../../utils/errors';
// import { formatINR, toPaise } from '../../utils/money';
// import { haptic } from '../../hooks/useHaptic';
// import type { PaymentMethod } from '../../types/models';

// /**
//  * Customer declares a payment made OUTSIDE the app (UPI scan or cash).
//  * Declaring never reduces the balance; the shopkeeper must mark it received.
//  */
// export function PaymentDeclarationScreen() {
//   const nav = useNavigation<any>();
//   const { theme } = useTheme();
//   const { shopId, shopName, transactionId } = useRoute<any>().params as { shopId: string; shopName: string; transactionId?: string };
//   const uid = useAppStore(s => s.session?.user.id)!;
//   const [method, setMethod] = useState<PaymentMethod>('UPI');
//   const [amount, setAmount] = useState('');
//   const [err, setErr] = useState<string | null>(null);
//   const [busy, setBusy] = useState(false);
//   const submitting = useRef(false);

//   const { data, loading, error, reload } = useLoad(async () => {
//     const [{ data: shop }, balances, pending] = await Promise.all([
//       supabase.from('shops').select('upi_qr_url').eq('id', shopId).single(),
//       listBalances({ shopId, customerId: uid }),
//       listPayments({ customerId: uid, shopId, status: 'PENDING' }),
//     ]);
//     const open = balances.filter(b => b.transaction_status !== 'VOIDED' && b.remaining_amount > 0);
//     const scope = transactionId ? open.filter(b => b.transaction_id === transactionId) : open;
//     const outstanding = scope.reduce((s, b) => s + b.remaining_amount, 0);
//     const pendingSum = pending.filter(p => (transactionId ? p.transaction_id === transactionId : true)).reduce((s, p) => s + p.amount, 0);
//     return { outstanding, pendingSum, available: Math.max(0, (toPaise(outstanding) - toPaise(pendingSum)) / 100), upi: await signedUpiUrl(shop?.upi_qr_url ?? null) };
//   }, [shopId, uid, transactionId]);

//   const submit = async () => {
//     if (submitting.current || !data) return;
//     const n = Number(amount);
//     const parsed = amountSchema(data.available).safeParse(Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN);
//     if (!parsed.success) { setErr(parsed.error.issues[0].message); return; }
//     setErr(null); submitting.current = true; setBusy(true);
//     try {
//       const id = await declarePayment({ shopId, amount: parsed.data, method, transactionId });
//       haptic('notificationSuccess');
//       Alert.alert('Payment declared', `${shopName} will check and confirm. Your balance updates once they mark it received.`, [{ text: 'OK', onPress: () => nav.replace('PaymentDetails', { id }) }]);
//     } catch (e) { haptic('notificationError'); setErr(friendlyError(e)); submitting.current = false; } finally { setBusy(false); }
//   };

//   if (loading) return <Screen><Header title="Declare payment" /><LoadingIndicator /></Screen>;
//   if (error || !data) return <Screen><Header title="Declare payment" /><ErrorState message={error ?? ''} onRetry={reload} /></Screen>;

//   const opt = (m: PaymentMethod, label: string, Icon: typeof QrCode) => (
//     <Pressable key={m} onPress={() => setMethod(m)} accessibilityRole="radio" accessibilityState={{ selected: method === m }}
//       style={{ flex: 1, alignItems: 'center', gap: 6, padding: 16, borderRadius: theme.radius.lg, borderWidth: 2, borderColor: method === m ? theme.colors.primary : theme.colors.border, backgroundColor: method === m ? theme.colors.mint : theme.colors.card }}>
//       <Icon size={26} color={method === m ? theme.colors.primary : theme.colors.textSecondary} /><AppText variant="label">{label}</AppText>
//     </Pressable>
//   );
//   return (
//     <Screen>
//       <Header title="Declare payment" subtitle={shopName} />
//       <RoundedCard tone="mint" style={{ gap: 4 }}>
//         <AppText variant="caption" color="secondary">{transactionId ? 'This bill' : 'Total outstanding'}</AppText>
//         <AmountDisplay amount={data.outstanding} size="title" />
//         {data.pendingSum > 0 ? <AppText variant="caption" color="warning">{formatINR(data.pendingSum)} already awaiting the shop's confirmation</AppText> : null}
//       </RoundedCard>
//       <View style={{ flexDirection: 'row', gap: 12 }}>{opt('UPI', 'UPI', QrCode)}{opt('CASH', 'Cash', Banknote)}</View>

//       {method === 'UPI' ? (
//         <RoundedCard style={{ gap: 10, alignItems: 'center' }}>
//           {data.upi ? <Image source={{ uri: data.upi }} style={{ width: 230, height: 230, borderRadius: 16 }} resizeMode="contain" /> : <AppText color="secondary">This shop hasn't uploaded a UPI QR yet. You can still pay in cash.</AppText>}
//           <AppText variant="caption" color="secondary" style={{ textAlign: 'center' }}>Scan this with Google Pay, PhonePe, Paytm or any UPI app. Pay there, then come back and enter the amount below. KhataConnect doesn't process the payment.</AppText>
//         </RoundedCard>
//       ) : <RoundedCard><AppText color="secondary">Hand the cash to the shopkeeper, then enter the amount you gave.</AppText></RoundedCard>}

//       <AppInput label="Amount you paid (₹)" value={amount} onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" error={err ?? undefined} style={{ fontSize: 22 }} />
//       <PrimaryButton title="I've paid — notify shop" onPress={submit} loading={busy} disabled={data.available <= 0} />
//       {data.available <= 0 ? <AppText color="secondary">Nothing left to declare for now.</AppText> : null}
//     </Screen>
//   );
// }




import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  View,
  Modal,
  StatusBar,
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';

import { useNavigation, useRoute } from '@react-navigation/native';
import { Banknote, QrCode, X, Copy } from 'lucide-react-native';

import { Screen } from '../../components/common/Screen';
import { Header } from '../../components/common/Header';
import { RoundedCard } from '../../components/common/RoundedCard';
import { AppText } from '../../components/common/AppText';
import { AppInput } from '../../components/common/AppInput';
import { PrimaryButton } from '../../components/common/Buttons';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { ErrorState, LoadingIndicator } from '../../components/common/States';

import { useLoad } from '../../hooks/useLoad';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../theme/useTheme';

import { supabase } from '../../services/supabase/client';
import { signedUpiUrl } from '../../services/shop/shopService';
import { listBalances } from '../../services/transaction/transactionService';
import {
  declarePayment,
  listPayments,
} from '../../services/payment/paymentService';

import { amountSchema } from '../../utils/validation';
import { friendlyError } from '../../utils/errors';
import { formatINR, toPaise } from '../../utils/money';
import { haptic } from '../../hooks/useHaptic';

import type { PaymentMethod } from '../../types/models';

export function PaymentDeclarationScreen() {
  const nav = useNavigation<any>();
  const { theme } = useTheme();

  const {
    shopId,
    shopName,
    transactionId,
  } = useRoute<any>().params as {
    shopId: string;
    shopName: string;
    transactionId?: string;
  };

  const uid = useAppStore(s => s.session?.user.id)!;

  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);

  const submitting = useRef(false);

  // Load shop payment details and outstanding balance
  const {
    data,
    loading,
    error,
    reload,
  } = useLoad(async () => {
    const [{ data: shop, error: shopError }, balances, pending] =
      await Promise.all([
        supabase
          .from('shops')
          .select('upi_qr_url, upi_id, payment_phone')
          .eq('id', shopId)
          .single(),

        listBalances({
          shopId,
          customerId: uid,
        }),

        listPayments({
          customerId: uid,
          shopId,
          status: 'PENDING',
        }),
      ]);

    if (shopError) throw shopError;

    const open = balances.filter(
      b =>
        b.transaction_status !== 'VOIDED' &&
        b.remaining_amount > 0
    );

    const scope = transactionId
      ? open.filter(b => b.transaction_id === transactionId)
      : open;

    const outstanding = scope.reduce(
      (s, b) => s + b.remaining_amount,
      0
    );

    const pendingSum = pending
      .filter(p =>
        transactionId
          ? p.transaction_id === transactionId
          : true
      )
      .reduce((s, p) => s + p.amount, 0);

    return {
      outstanding,
      pendingSum,

      available: Math.max(
        0,
        (toPaise(outstanding) - toPaise(pendingSum)) / 100
      ),

      upi: await signedUpiUrl(shop?.upi_qr_url ?? null),

      upiId: shop?.upi_id?.trim() || null,

      paymentPhone: shop?.payment_phone?.trim() || null,
    };
  }, [shopId, uid, transactionId]);

  // Copy payment details
  const copyDetail = (label: string, value: string) => {
    Clipboard.setString(value);

    haptic('notificationSuccess');

    Alert.alert(
      'Copied!',
      `${label} copied to clipboard.`
    );
  };

  // Submit payment declaration
  const submit = async () => {
    if (submitting.current || !data) return;

    const n = Number(amount);

    const parsed = amountSchema(data.available).safeParse(
      Number.isFinite(n)
        ? Math.round(n * 100) / 100
        : NaN
    );

    if (!parsed.success) {
      setErr(parsed.error.issues[0].message);
      return;
    }

    setErr(null);
    submitting.current = true;
    setBusy(true);

    try {
      const id = await declarePayment({
        shopId,
        amount: parsed.data,
        method,
        transactionId,
      });

      haptic('notificationSuccess');

      Alert.alert(
        'Payment declared',
        `${shopName} will check and confirm. Your balance updates once they mark it received.`,
        [
          {
            text: 'OK',
            onPress: () =>
              nav.replace('PaymentDetails', { id }),
          },
        ]
      );
    } catch (e) {
      haptic('notificationError');
      setErr(friendlyError(e));
      submitting.current = false;
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Declare payment" />
        <LoadingIndicator />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <Header title="Declare payment" />
        <ErrorState
          message={error ?? ''}
          onRetry={reload}
        />
      </Screen>
    );
  }

  const opt = (
    m: PaymentMethod,
    label: string,
    Icon: typeof QrCode
  ) => (
    <Pressable
      key={m}
      onPress={() => setMethod(m)}
      accessibilityRole="radio"
      accessibilityState={{ selected: method === m }}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 6,
        padding: 16,
        borderRadius: theme.radius.lg,
        borderWidth: 2,
        borderColor:
          method === m
            ? theme.colors.primary
            : theme.colors.border,
        backgroundColor:
          method === m
            ? theme.colors.mint
            : theme.colors.card,
      }}
    >
      <Icon
        size={26}
        color={
          method === m
            ? theme.colors.primary
            : theme.colors.textSecondary
        }
      />

      <AppText variant="label">{label}</AppText>
    </Pressable>
  );

  // Reusable copyable payment detail row
  const paymentDetail = (
    label: string,
    value: string,
    type: 'upi' | 'phone'
  ) => (
    <View
      style={{
        gap: 8,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText
            variant="label"
            style={{ fontSize: 16 }}
          >
            {value}
          </AppText>
        </View>

        <Pressable
          onPress={() => copyDetail(label, value)}
          accessibilityRole="button"
          accessibilityLabel={`Copy ${label}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: theme.colors.mint,
          }}
        >
          <Copy
            size={16}
            color={theme.colors.primary}
          />

          <AppText
            variant="label"
            color="primary"
          >
            Copy
          </AppText>
        </Pressable>
      </View>

      {type === 'upi' ? (
        <AppText variant="caption" color="secondary">
          Pay using this UPI ID in your preferred UPI app.
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <Header
        title="Declare payment"
        subtitle={shopName}
      />

      {/* OUTSTANDING BALANCE */}

      <RoundedCard tone="mint" style={{ gap: 4 }}>
        <AppText variant="caption" color="secondary">
          {transactionId ? 'This bill' : 'Total outstanding'}
        </AppText>

        <AmountDisplay
          amount={data.outstanding}
          size="title"
        />

        {data.pendingSum > 0 ? (
          <AppText variant="caption" color="warning">
            {formatINR(data.pendingSum)} already awaiting the shop's confirmation
          </AppText>
        ) : null}
      </RoundedCard>

      {/* PAYMENT METHOD */}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {opt('UPI', 'UPI', QrCode)}
        {opt('CASH', 'Cash', Banknote)}
      </View>

      {method === 'UPI' ? (
        <>
          {/* QR CODE */}

          {data.upi ? (
            <RoundedCard
              style={{
                gap: 10,
                alignItems: 'center',
              }}
            >
              <AppText variant="label">
                Scan UPI QR code
              </AppText>

              <Pressable
                onPress={() => setQrExpanded(true)}
                accessibilityRole="button"
                accessibilityLabel="View UPI QR code full screen"
                style={{ alignItems: 'center' }}
              >
                <Image
                  source={{ uri: data.upi }}
                  style={{
                    width: 230,
                    height: 230,
                    borderRadius: 16,
                  }}
                  resizeMode="contain"
                />

                <AppText
                  variant="caption"
                  color="primary"
                  style={{ marginTop: 8 }}
                >
                  Tap to view full screen
                </AppText>
              </Pressable>
            </RoundedCard>
          ) : null}

          {/* COPYABLE PAYMENT DETAILS */}

          {(data.upiId || data.paymentPhone) ? (
            <RoundedCard style={{ gap: 6 }}>
              <AppText variant="label">
                Other payment options
              </AppText>

              <AppText
                variant="caption"
                color="secondary"
              >
                You can copy these details and pay directly through your UPI application.
              </AppText>

              {data.upiId
                ? paymentDetail(
                    'UPI ID',
                    data.upiId,
                    'upi'
                  )
                : null}

              {data.paymentPhone
                ? paymentDetail(
                    'Payment phone number',
                    data.paymentPhone,
                    'phone'
                  )
                : null}
            </RoundedCard>
          ) : null}

          {/* NO PAYMENT DETAILS */}

          {!data.upi && !data.upiId && !data.paymentPhone ? (
            <RoundedCard>
              <AppText color="secondary">
                This shop hasn't added any UPI payment details yet. You can still pay in cash.
              </AppText>
            </RoundedCard>
          ) : null}

          <AppText
            variant="caption"
            color="secondary"
            style={{ textAlign: 'center' }}
          >
            Pay using Google Pay, PhonePe, Paytm or any UPI app.
            Once you've paid, come back and enter the amount below.
            KhataConnect doesn't process the payment.
          </AppText>
        </>
      ) : (
        <RoundedCard>
          <AppText color="secondary">
            Hand the cash to the shopkeeper, then enter the amount you gave.
          </AppText>
        </RoundedCard>
      )}

      {/* PAYMENT AMOUNT */}

      <AppInput
        label="Amount you paid (₹)"
        value={amount}
        onChangeText={t =>
          setAmount(t.replace(/[^0-9.]/g, ''))
        }
        keyboardType="decimal-pad"
        placeholder="0"
        error={err ?? undefined}
        style={{ fontSize: 22 }}
      />

      <PrimaryButton
        title="I've paid — notify shop"
        onPress={submit}
        loading={busy}
        disabled={data.available <= 0}
      />

      {data.available <= 0 ? (
        <AppText color="secondary">
          Nothing left to declare for now.
        </AppText>
      ) : null}

      {/* FULL SCREEN QR PREVIEW */}

      <Modal
        visible={qrExpanded}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setQrExpanded(false)}
      >
        <StatusBar
          backgroundColor="#000000"
          barStyle="light-content"
        />

        <View
          style={{
            flex: 1,
            backgroundColor: '#000000',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            onPress={() => setQrExpanded(false)}
            accessibilityRole="button"
            accessibilityLabel="Close QR preview"
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 2,
              padding: 12,
            }}
          >
            <X size={30} color="#FFFFFF" />
          </Pressable>

          <AppText
            style={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '600',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            {shopName} - UPI QR
          </AppText>

          {/* Render only if QR URL exists */}
          {data.upi ? (
            <Image
              source={{ uri: data.upi }}
              style={{
                width: '100%',
                height: '75%',
              }}
              resizeMode="contain"
            />
          ) : null}

          <AppText
            style={{
              color: '#FFFFFF',
              marginTop: 20,
              textAlign: 'center',
            }}
          >
            Scan using any UPI application
          </AppText>
        </View>
      </Modal>
    </Screen>
  );
}
