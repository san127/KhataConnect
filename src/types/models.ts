export type Role = 'CUSTOMER' | 'SHOPKEEPER';
export type ConnectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISCONNECTED';
export type PaymentStatus = 'PENDING' | 'RECEIVED' | 'REJECTED';
export type PaymentMethod = 'UPI' | 'CASH';

export interface Profile {
  id: string; full_name: string; phone: string | null; email: string | null; avatar_url: string | null;
  notification_prefs: Record<string, boolean>;
}
// export interface Shop {
//   id: string; owner_id: string; shop_name: string; owner_name: string | null; contact_phone: string | null;
//   shop_code: string; qr_token: string; category: string | null; address: string | null; description: string | null;
//   profile_image_url: string | null; cover_image_url: string | null; upi_qr_url: string | null; is_active: boolean;
// }


export interface Shop {
  id: string;
  owner_id: string;

  shop_name: string;
  owner_name: string | null;
  contact_phone: string | null;

  shop_code: string;
  qr_token: string;

  category: string | null;
  address: string | null;
  description: string | null;

  profile_image_url: string | null;
  cover_image_url: string | null;

  // Payment details
  upi_qr_url: string | null;
  upi_id: string | null;
  payment_phone: string | null;

  is_active: boolean;
}

export interface ShopPreview {
  id: string; shop_name: string; shop_code: string; category: string | null; address: string | null;
  description: string | null; profile_image_url: string | null; cover_image_url: string | null;
  is_own_shop: boolean; connection_status: ConnectionStatus | null;
}
export interface ConnectionRow {
  id: string; shop_id: string; customer_id: string; requested_by: string; connection_status: ConnectionStatus;
  created_at: string; shops?: Pick<Shop, 'shop_name' | 'category' | 'shop_code' | 'profile_image_url'>;
  profiles?: Pick<Profile, 'full_name' | 'phone'>;
}
export interface TxItem { id: string; item_name: string; quantity: number; unit_price: number; subtotal: number }
export interface Balance {
  transaction_id: string; shop_id: string; customer_id: string; total_amount: number; paid_amount: number;
  remaining_amount: number; due_date: string | null; created_at: string;
  transaction_status: 'CONFIRMED' | 'DISPUTED' | 'VOIDED';
  acknowledgement_status: 'AWAITING' | 'ACKNOWLEDGED' | 'DISPUTED';
}
export interface Payment {
  id: string; shop_id: string; customer_id: string; transaction_id: string | null; payment_type: 'INDIVIDUAL' | 'OVERALL';
  amount: number; payment_method: PaymentMethod; verification_status: PaymentStatus; rejection_reason: string | null;
  declared_at: string; verified_at: string | null;
  shops?: { shop_name: string }; profiles?: { full_name: string };
}
export interface AppNotification {
  id: string; title: string; message: string; notification_type: string; related_id: string | null;
  is_read: boolean; created_at: string;
}
export interface Dispute {
  id: string; transaction_id: string; dispute_reason: string; description: string | null;
  dispute_status: 'OPEN' | 'RESOLVED_VOIDED' | 'RESOLVED_UPHELD'; resolution_notes: string | null; created_at: string;
  profiles?: { full_name: string }; shops?: { shop_name: string };
}
export interface ShopSummary {
  connection_id: string; shop_id: string; shop_name: string; category: string | null; shop_code: string;
  profile_image_url: string | null; outstanding: number; unpaid_count: number; next_due: string | null; overdue_count: number;
}
export interface CustomerSummary {
  customer_id: string; full_name: string; phone: string | null; outstanding: number; total_purchases: number;
  last_purchase: string | null; pending_declarations: number; overdue_count: number;
}
