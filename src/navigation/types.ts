import type { NavigatorScreenParams } from '@react-navigation/native';
import type { OtpKind } from '../services/auth/authService';

export type AuthStackParams = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { identifier: string; kind: OtpKind };
  ResetPassword: undefined;
  EmailVerification: { email: string };
};

export type CustomerTabParams = {
  Home: undefined; MyShops: undefined; Payments: undefined; Notifications: undefined; Profile: undefined;
};
export type CustomerStackParams = {
  CustomerTabs: NavigatorScreenParams<CustomerTabParams>;
  ScanShopQR: undefined;
  EnterShopCode: undefined;
  ShopPreview: { preview: import('../types/models').ShopPreview };
  ConnectionRequests: undefined;
  ShopDetails: { shopId: string; shopName: string };
  PurchaseDetails: { id: string };
  PaymentDeclaration: { shopId: string; shopName: string; transactionId?: string; shopUpiPath?: string | null };
  PaymentDetails: { id: string };
  Disputes: undefined;
  PersonalQR: undefined;
  Settings: undefined;
  VerifyOTP: { identifier: string; kind: OtpKind };
  ShopRegistration: undefined;
};

export type ShopTabParams = {
  Dashboard: undefined; Customers: undefined; Transactions: undefined; Payments: undefined; Profile: undefined;
};
export type ShopStackParams = {
  ShopTabs: NavigatorScreenParams<ShopTabParams>;
  ShopRegistration: undefined;
  ShopQR: undefined;
  Notifications: undefined;
  CustomerScanner: undefined;
  ShopConnectionRequests: undefined;
  CustomerDetails: { customerId: string; name: string };
  AddPurchase: { customerId?: string; customerName?: string } | undefined;
  PurchaseDetails: { id: string };
  PaymentVerification: { id: string };
  PaymentDetails: { id: string };
  Reports: undefined;
  ReminderSettings: undefined;
  ShopProfileEdit: undefined;
  ShopDisputes: undefined;
  Settings: undefined;
  VerifyOTP: { identifier: string; kind: OtpKind };
};
