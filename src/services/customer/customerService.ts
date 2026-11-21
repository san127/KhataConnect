import { supabase } from '../supabase/client';
import { rpc, unwrap } from '../supabase/rpc';
import type { ConnectionRow, CustomerSummary, ShopSummary } from '../../types/models';

export const customerDashboard = () => rpc<{
  total_outstanding: number; overdue_amount: number; overdue_count: number; shop_count: number; pending_declarations: number;
}>('customer_dashboard');
export const customerShopSummaries = () => rpc<ShopSummary[]>('customer_shop_summaries');
export const shopCustomerSummaries = (shopId: string) => rpc<CustomerSummary[]>('shop_customer_summaries', { p_shop_id: shopId });

export const requestShopConnection = (shopId: string) => rpc<string>('request_shop_connection', { p_shop_id: shopId });
export const getCustomerByToken = (token: string) =>
  rpc<{ id: string; full_name: string; avatar_url: string | null }>('get_customer_by_token', { p_token: token });
export const requestCustomerConnection = (shopId: string, token: string) =>
  rpc<string>('request_customer_connection', { p_shop_id: shopId, p_token: token });
export const respondConnection = (id: string, approve: boolean) => rpc<void>('respond_connection', { p_connection_id: id, p_approve: approve });
export const disconnect = (id: string) => rpc<void>('disconnect_connection', { p_connection_id: id });

/** Requests waiting for ME to answer (the other side requested). */
export async function incomingRequestsForCustomer(uid: string): Promise<ConnectionRow[]> {
  const rows = unwrap(await supabase.from('shop_customers')
    .select('*, shops(shop_name, category, shop_code, profile_image_url)')
    .eq('customer_id', uid).eq('connection_status', 'PENDING').neq('requested_by', uid).order('created_at', { ascending: false }));
  return rows as ConnectionRow[];
}
export async function incomingRequestsForShop(shopId: string): Promise<ConnectionRow[]> {
  const rows = unwrap(await supabase.from('shop_customers')
    .select('*, profiles!shop_customers_customer_id_fkey(full_name, phone)')
    .eq('shop_id', shopId).eq('connection_status', 'PENDING').order('created_at', { ascending: false }));
  return (rows as ConnectionRow[]).filter(r => r.requested_by === r.customer_id);
}
/** Requests I sent and that are still pending. */
export async function outgoingRequestsForCustomer(uid: string): Promise<ConnectionRow[]> {
  const rows = unwrap(await supabase.from('shop_customers')
    .select('*, shops(shop_name, category, shop_code, profile_image_url)')
    .eq('customer_id', uid).eq('connection_status', 'PENDING').eq('requested_by', uid));
  return rows as ConnectionRow[];
}
