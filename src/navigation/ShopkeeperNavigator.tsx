import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Receipt, User, Users, Wallet } from 'lucide-react-native';
import type { ShopStackParams, ShopTabParams } from './types';
import { makeTabBar } from './TabBar';
import { ShopDashboardScreen } from '../screens/shopkeeper/ShopDashboardScreen';
import { CustomersScreen } from '../screens/shopkeeper/CustomersScreen';
import { TransactionsScreen } from '../screens/shopkeeper/TransactionsScreen';
import { ShopPaymentsScreen } from '../screens/shopkeeper/ShopPaymentsScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { ShopRegistrationScreen } from '../screens/shopkeeper/ShopRegistrationScreen';
import { ShopQRScreen } from '../screens/shopkeeper/ShopQRScreen';
import { CustomerScannerScreen } from '../screens/shopkeeper/CustomerScannerScreen';
import { ShopConnectionRequestsScreen } from '../screens/shopkeeper/ShopConnectionRequestsScreen';
import { CustomerDetailsScreen } from '../screens/shopkeeper/CustomerDetailsScreen';
import { AddPurchaseScreen } from '../screens/shopkeeper/AddPurchaseScreen';
import { PurchaseDetailsScreen } from '../screens/common/PurchaseDetailsScreen';
import { PaymentVerificationScreen } from '../screens/shopkeeper/PaymentVerificationScreen';
import { PaymentDetailsScreen } from '../screens/common/PaymentDetailsScreen';
import { ReportsScreen } from '../screens/shopkeeper/ReportsScreen';
import { ReminderSettingsScreen } from '../screens/shopkeeper/ReminderSettingsScreen';
import { ShopProfileEditScreen } from '../screens/shopkeeper/ShopProfileEditScreen';
import { DisputesScreen } from '../screens/customer/DisputesScreen';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { SettingsScreen } from '../screens/common/SettingsScreen';
import { VerifyOTPScreen } from '../screens/auth/VerifyOTPScreen';

const Tabs = createBottomTabNavigator<ShopTabParams>();
const Stack = createNativeStackNavigator<ShopStackParams>();
const TabBar = makeTabBar(
  { Dashboard: LayoutDashboard, Customers: Users, Transactions: Receipt, Payments: Wallet, Profile: User },
  { Dashboard: 'Dashboard', Customers: 'Customers', Transactions: 'Bills', Payments: 'Payments', Profile: 'Profile' },
);
const ShopDisputes = () => <DisputesScreen shopMode />;

function ShopTabs() {
  return (
    <Tabs.Navigator tabBar={p => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Dashboard" component={ShopDashboardScreen} />
      <Tabs.Screen name="Customers" component={CustomersScreen} />
      <Tabs.Screen name="Transactions" component={TransactionsScreen} />
      <Tabs.Screen name="Payments" component={ShopPaymentsScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export function ShopkeeperNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="ShopTabs" component={ShopTabs} />
      <Stack.Screen name="ShopRegistration" component={ShopRegistrationScreen} />
      <Stack.Screen name="ShopQR" component={ShopQRScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="CustomerScanner" component={CustomerScannerScreen} />
      <Stack.Screen name="ShopConnectionRequests" component={ShopConnectionRequestsScreen} />
      <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} />
      <Stack.Screen name="AddPurchase" component={AddPurchaseScreen} />
      <Stack.Screen name="PurchaseDetails" component={PurchaseDetailsScreen} />
      <Stack.Screen name="PaymentVerification" component={PaymentVerificationScreen} />
      <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="ReminderSettings" component={ReminderSettingsScreen} />
      <Stack.Screen name="ShopProfileEdit" component={ShopProfileEditScreen} />
      <Stack.Screen name="ShopDisputes" component={ShopDisputes} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
    </Stack.Navigator>
  );
}
