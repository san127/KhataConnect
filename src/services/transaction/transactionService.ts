import { supabase } from '../supabase/client';
import { rpc, unwrap } from '../supabase/rpc';
import type { Balance, Dispute, TxItem } from '../../types/models';
import type { DraftItem } from '../../utils/money';

export const addPurchase = (p: { shopId: string; customerId: string; items: DraftItem[]; dueDate?: string | null; notes?: string }) =>
  rpc<string>('add_purchase', { p_shop_id: p.shopId, p_customer_id: p.customerId, p_items: p.items,
    p_due_date: p.dueDate ?? null, p_notes: p.notes ?? null });

export async function listBalances(filter: { shopId?: string; customerId?: string; from?: string; to?: string }): Promise<Balance[]> {
  let q = supabase.from('transaction_balances').select('*').order('created_at', { ascending: false }).limit(300);
  if (filter.shopId) q = q.eq('shop_id', filter.shopId);
  if (filter.customerId) q = q.eq('customer_id', filter.customerId);
  if (filter.from) q = q.gte('created_at', filter.from);
  if (filter.to) q = q.lte('created_at', filter.to);
  return unwrap(await q) as Balance[];
}

export interface PurchaseDetail {
  balance: Balance & { notes: string | null };
  items: TxItem[];
  shop: { id: string; shop_name: string; owner_id: string };
  customer: { id: string; full_name: string };
  audit: { id: string; action: string; reason: string | null; created_at: string }[];
  dispute: Dispute | null;
  payments: { id: string; allocated_amount: number; created_at: string; payments: { payment_method: string; verified_at: string | null } }[];
}

export async function getPurchase(id: string): Promise<PurchaseDetail> {
  const [bal, tx, items, audit, disputes, allocs] = await Promise.all([
    supabase.from('transaction_balances').select('*').eq('transaction_id', id).single(),
    supabase.from('transactions').select('notes, shops(id, shop_name, owner_id), profiles!transactions_customer_id_fkey(id, full_name)').eq('id', id).single(),
    supabase.from('transaction_items').select('*').eq('transaction_id', id).order('created_at'),
    supabase.from('transaction_audit').select('*').eq('transaction_id', id).order('created_at'),
    supabase.from('disputes').select('*').eq('transaction_id', id).order('created_at', { ascending: false }).limit(1),
    supabase.from('payment_allocations').select('id, allocated_amount, created_at, payments!inner(payment_method, verified_at, verification_status)')
      .eq('transaction_id', id).eq('payments.verification_status', 'RECEIVED'),
  ]);
  const b = unwrap(bal as never) as Balance;
  const t = unwrap(tx as never) as { notes: string | null; shops: PurchaseDetail['shop']; profiles: PurchaseDetail['customer'] };
  return {
    balance: { ...b, notes: t.notes }, items: unwrap(items as never) as TxItem[], shop: t.shops, customer: t.profiles,
    audit: unwrap(audit as never) as PurchaseDetail['audit'],
    dispute: ((unwrap(disputes as never) as Dispute[])[0]) ?? null,
    payments: unwrap(allocs as never) as PurchaseDetail['payments'],
  };
}

export const acknowledgePurchase = (id: string) => rpc<void>('acknowledge_purchase', { p_tx_id: id });
export const raiseDispute = (id: string, reason: string, description?: string) =>
  rpc<string>('raise_dispute', { p_tx_id: id, p_reason: reason, p_description: description ?? null });
export const resolveDispute = (id: string, voidIt: boolean, notes?: string) =>
  rpc<void>('resolve_dispute', { p_dispute_id: id, p_void: voidIt, p_notes: notes ?? null });

export async function listDisputes(scope: { shopId?: string; customerId?: string }): Promise<Dispute[]> {
  let q = supabase.from('disputes').select('*, profiles!disputes_customer_id_fkey(full_name), shops(shop_name)').order('created_at', { ascending: false });
  if (scope.shopId) q = q.eq('shop_id', scope.shopId);
  if (scope.customerId) q = q.eq('customer_id', scope.customerId);
  return unwrap(await q) as Dispute[];
}
