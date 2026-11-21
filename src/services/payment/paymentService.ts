import { supabase } from '../supabase/client';
import { rpc, unwrap } from '../supabase/rpc';
import type { Payment, PaymentMethod, PaymentStatus } from '../../types/models';
import type { Allocation } from '../../utils/money';

export const declarePayment = (p: { shopId: string; amount: number; method: PaymentMethod; transactionId?: string | null }) =>
  rpc<string>('declare_payment', { p_shop_id: p.shopId, p_amount: p.amount, p_method: p.method, p_transaction_id: p.transactionId ?? null });

export const verifyPayment = (id: string, allocations?: Allocation[]) =>
  rpc<void>('verify_payment', { p_payment_id: id, p_allocations: allocations?.length ? allocations : null });
export const rejectPayment = (id: string, reason?: string) => rpc<void>('reject_payment', { p_payment_id: id, p_reason: reason ?? null });

export interface Receipt {
  receipt_no: string; shop_name: string; shop_code: string; customer_name: string; amount: number; method: string;
  declared_at: string; verified_at: string; allocations: { transaction_id: string; amount: number; bill_date: string }[];
}
export const getReceipt = (id: string) => rpc<Receipt>('get_receipt', { p_payment_id: id });

export async function listPayments(f: { shopId?: string; customerId?: string; status?: PaymentStatus; limit?: number }): Promise<Payment[]> {
  let q = supabase.from('payments').select('*, shops(shop_name), profiles!payments_customer_id_fkey(full_name)')
    .order('declared_at', { ascending: false }).limit(f.limit ?? 200);
  if (f.shopId) q = q.eq('shop_id', f.shopId);
  if (f.customerId) q = q.eq('customer_id', f.customerId);
  if (f.status) q = q.eq('verification_status', f.status);
  return unwrap(await q) as Payment[];
}

export async function getPayment(id: string): Promise<Payment> {
  return unwrap(await supabase.from('payments').select('*, shops(shop_name), profiles!payments_customer_id_fkey(full_name)').eq('id', id).single()) as Payment;
}

export const shopDashboard = (shopId: string) => rpc<{
  total_outstanding: number; overdue_amount: number; unpaid_count: number; collected_today: number;
  collected_month: number; pending_verifications: number; customer_count: number;
}>('shop_dashboard', { p_shop_id: shopId });

export const shopReport = (shopId: string, from: string, to: string) =>
  rpc<{ credit_given: number; collected_upi: number; collected_cash: number; daily: { day: string; amount: number }[] }>(
    'shop_report', { p_shop_id: shopId, p_from: from, p_to: to });
