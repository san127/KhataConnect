import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Bell, Home, Store, User, Wallet } from 'lucide-react-native';
import type { CustomerStackParams, CustomerTabParams } from './types';
import { makeTabBar } from './TabBar';
import { CustomerHomeScreen } from '../screens/customer/CustomerHomeScreen';
import { MyShopsScreen } from '../screens/customer/MyShopsScreen';
import { CustomerPaymentsScreen } from '../screens/customer/PaymentHistoryScreen';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { ScanShopQRScreen } from '../screens/common/QRScanScreen';
import { EnterShopCodeScreen } from '../screens/customer/EnterShopCodeScreen';
import { ShopPreviewScreen } from '../screens/customer/ShopPreviewScreen';
import { ConnectionRequestsScreen } from '../screens/customer/ConnectionRequestsScreen';
import { ShopDetailsScreen } from '../screens/customer/ShopDetailsScreen';
import { PurchaseDetailsScreen } from '../screens/common/PurchaseDetailsScreen';
import { PaymentDeclarationScreen } from '../screens/customer/PaymentDeclarationScreen';
import { PaymentDetailsScreen } from '../screens/common/PaymentDetailsScreen';
import { DisputesScreen } from '../screens/customer/DisputesScreen';
import { PersonalQRScreen } from '../screens/customer/PersonalQRScreen';
import { SettingsScreen } from '../screens/common/SettingsScreen';
import { VerifyOTPScreen } from '../screens/auth/VerifyOTPScreen';
import { ShopRegistrationScreen } from '../screens/shopkeeper/ShopRegistrationScreen';

const Tabs = createBottomTabNavigator<CustomerTabParams>();
const Stack = createNativeStackNavigator<CustomerStackParams>();
const TabBar = makeTabBar(
  { Home, MyShops: Store, Payments: Wallet, Notifications: Bell, Profile: User },
  { Home: 'Home', MyShops: 'My shops', Payments: 'Payments', Notifications: 'Alerts', Profile: 'Profile' },
);

function CustomerTabs() {
  return (
    <Tabs.Navigator tabBar={p => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Home" component={CustomerHomeScreen} />
      <Tabs.Screen name="MyShops" component={MyShopsScreen} />
      <Tabs.Screen name="Payments" component={CustomerPaymentsScreen} />
      <Tabs.Screen name="Notifications" component={NotificationsScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="ScanShopQR" component={ScanShopQRScreen} />
      <Stack.Screen name="EnterShopCode" component={EnterShopCodeScreen} />
      <Stack.Screen name="ShopPreview" component={ShopPreviewScreen} />
      <Stack.Screen name="ConnectionRequests" component={ConnectionRequestsScreen} />
      <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} />
      <Stack.Screen name="PurchaseDetails" component={PurchaseDetailsScreen} />
      <Stack.Screen name="PaymentDeclaration" component={PaymentDeclarationScreen} />
      <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} />
      <Stack.Screen name="Disputes" component={DisputesScreen} />
      <Stack.Screen name="PersonalQR" component={PersonalQRScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
      <Stack.Screen name="ShopRegistration" component={ShopRegistrationScreen} />
    </Stack.Navigator>
  );
}
