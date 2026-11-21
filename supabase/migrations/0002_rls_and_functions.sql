-- RLS + atomic RPCs. All mutations of financial/connection state go through RPCs.

-- ------------------------------------------------------------------ helpers
create or replace function public.is_shop_owner(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shops where id = p_shop and owner_id = auth.uid());
$$;

create or replace function public.is_approved(p_shop uuid, p_customer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shop_customers
                 where shop_id = p_shop and customer_id = p_customer and connection_status = 'APPROVED');
$$;

create or replace function public._require_auth() returns uuid
language plpgsql stable set search_path = public as $$
declare v uuid := auth.uid();
begin if v is null then raise exception 'not authenticated' using errcode = '28000'; end if; return v; end $$;

create or replace function public._notify(p_user uuid, p_title text, p_msg text, p_type text,
                                          p_related uuid, p_dedupe text default null) returns void
language plpgsql security definer set search_path = public as $$
declare cat text; prefs jsonb;
begin
  cat := case
    when p_type like 'CONNECTION%' then 'connections'
    when p_type like 'PURCHASE%' then 'purchases'
    when p_type like 'PAYMENT_DUE%' or p_type like 'PAYMENT_OVERDUE%' then 'reminders'
    when p_type like 'PAYMENT%' then 'payments'
    when p_type like 'DISPUTE%' then 'disputes'
    else 'purchases' end;
  select notification_prefs into prefs from public.profiles where id = p_user;
  if prefs is not null and coalesce((prefs->>cat)::boolean, true) = false then return; end if;
  insert into public.notifications(user_id, title, message, notification_type, related_id, dedupe_key)
  values (p_user, p_title, p_msg, p_type, p_related, p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end $$;
revoke all on function public._notify(uuid,text,text,text,uuid,text) from public, anon, authenticated;

create or replace function public._fmt(p numeric) returns text
language sql immutable set search_path = public as $$ select '₹' || trim(to_char(p, 'FM9,99,99,99,990.00')); $$;

-- shop_code is immutable once issued
create or replace function public.block_shop_code_change() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.shop_code <> old.shop_code then raise exception 'shop code cannot be changed'; end if;
  if new.owner_id <> old.owner_id then raise exception 'owner cannot be changed'; end if;
  return new;
end $$;
create trigger shops_code_immutable before update on public.shops
  for each row execute function public.block_shop_code_change();

-- ---------------------------------------------------------------- RLS enable
alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.shop_customers enable row level security;
alter table public.customer_qr_tokens enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.transaction_audit enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.disputes enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.shop_reminder_settings enable row level security;

-- Start from zero privileges for API roles, then grant narrowly.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.shops, public.shop_customers, public.customer_qr_tokens,
  public.transactions, public.transaction_items, public.transaction_audit, public.payments,
  public.payment_allocations, public.disputes, public.notifications, public.transaction_balances
  to authenticated;
grant update (full_name, avatar_url, notification_prefs) on public.profiles to authenticated;
grant update (shop_name, owner_name, contact_phone, category, address, description,
              profile_image_url, cover_image_url, upi_qr_url, is_active) on public.shops to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;
grant select, insert, update on public.shop_reminder_settings to authenticated;

-- profiles
create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_counterparty_select on public.profiles for select using (
  exists (select 1 from public.shop_customers sc join public.shops s on s.id = sc.shop_id
          where sc.customer_id = profiles.id and s.owner_id = auth.uid())
);
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- shops (customers see shops they have a connection row with; previews go through RPC)
create policy shops_owner_select on public.shops for select using (owner_id = auth.uid());
create policy shops_customer_select on public.shops for select using (
  exists (select 1 from public.shop_customers sc where sc.shop_id = shops.id and sc.customer_id = auth.uid())
);
create policy shops_owner_update on public.shops for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- connections
create policy sc_select on public.shop_customers for select using (
  customer_id = auth.uid() or public.is_shop_owner(shop_id));

-- customer QR (token only visible to its owner)
create policy cqr_select on public.customer_qr_tokens for select using (user_id = auth.uid());

-- transactions & items (ledger needs APPROVED connection)
create policy tx_customer_select on public.transactions for select using (
  customer_id = auth.uid() and public.is_approved(shop_id, customer_id));
create policy tx_owner_select on public.transactions for select using (public.is_shop_owner(shop_id));
create policy items_select on public.transaction_items for select using (
  exists (select 1 from public.transactions t where t.id = transaction_id
          and ((t.customer_id = auth.uid() and public.is_approved(t.shop_id, t.customer_id))
               or public.is_shop_owner(t.shop_id))));
create policy audit_select on public.transaction_audit for select using (
  exists (select 1 from public.transactions t where t.id = transaction_id
          and ((t.customer_id = auth.uid() and public.is_approved(t.shop_id, t.customer_id))
               or public.is_shop_owner(t.shop_id))));

-- payments
create policy pay_customer_select on public.payments for select using (
  customer_id = auth.uid() and public.is_approved(shop_id, customer_id));
create policy pay_owner_select on public.payments for select using (public.is_shop_owner(shop_id));
create policy alloc_select on public.payment_allocations for select using (
  exists (select 1 from public.payments p where p.id = payment_id
          and ((p.customer_id = auth.uid() and public.is_approved(p.shop_id, p.customer_id))
               or public.is_shop_owner(p.shop_id))));

-- disputes
create policy disputes_select on public.disputes for select using (
  customer_id = auth.uid() or public.is_shop_owner(shop_id));

-- notifications
create policy notif_select on public.notifications for select using (user_id = auth.uid());
create policy notif_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- push tokens
create policy push_all on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reminder settings
create policy rem_owner on public.shop_reminder_settings for all
  using (public.is_shop_owner(shop_id)) with check (public.is_shop_owner(shop_id));

-- ------------------------------------------------------------- shop RPCs
create or replace function public.create_shop(p_name text, p_owner_name text, p_phone text,
  p_category text, p_address text, p_description text) returns public.shops
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); s public.shops; code text; base text; tries int := 0;
begin
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'Shop name is required'; end if;
  base := upper(left(regexp_replace(p_name, '[^A-Za-z]', '', 'g'), 3));
  if char_length(base) < 3 then base := rpad(base, 3, 'X'); end if;
  loop
    code := 'KH-' || base || lpad((floor(random() * 1000))::int::text, 3, '0');
    exit when not exists (select 1 from public.shops where shop_code = code);
    tries := tries + 1;
    if tries > 20 then base := upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 3)); end if;
    if tries > 60 then raise exception 'could not allocate shop code'; end if;
  end loop;
  insert into public.shops(owner_id, shop_name, owner_name, contact_phone, shop_code, category, address, description)
  values (uid, trim(p_name), p_owner_name, p_phone, code, p_category, p_address, p_description)
  returning * into s;
  insert into public.shop_reminder_settings(shop_id) values (s.id);
  return s;
end $$;

create or replace function public.regenerate_shop_qr(p_shop_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare t text := encode(gen_random_bytes(24), 'hex');
begin
  perform public._require_auth();
  if not public.is_shop_owner(p_shop_id) then raise exception 'not allowed'; end if;
  update public.shops set qr_token = t where id = p_shop_id;
  return t;
end $$;

-- Public preview: limited fields, no ledger data.
create or replace function public.get_shop_preview(p_code text default null, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._require_auth(); s public.shops; st text;
begin
  if p_code is not null then
    select * into s from public.shops where shop_code = upper(trim(p_code)) and is_active;
  elsif p_token is not null then
    select * into s from public.shops where qr_token = trim(p_token) and is_active;
  end if;
  if s.id is null then raise exception 'Shop not found or QR code is no longer valid'; end if;
  select connection_status into st from public.shop_customers where shop_id = s.id and customer_id = uid;
  return jsonb_build_object('id', s.id, 'shop_name', s.shop_name, 'shop_code', s.shop_code,
    'category', s.category, 'address', s.address, 'description', s.description,
    'profile_image_url', s.profile_image_url, 'cover_image_url', s.cover_image_url,
    'is_own_shop', s.owner_id = uid, 'connection_status', st);
end $$;

-- ------------------------------------------------------- connection RPCs
create or replace function public.request_shop_connection(p_shop_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); s public.shops; sc public.shop_customers; me text;
begin
  select * into s from public.shops where id = p_shop_id and is_active;
  if s.id is null then raise exception 'Shop not found'; end if;
  if s.owner_id = uid then raise exception 'You cannot connect to your own shop'; end if;
  select * into sc from public.shop_customers where shop_id = s.id and customer_id = uid for update;
  if sc.id is not null and sc.connection_status in ('PENDING','APPROVED') then
    raise exception 'Connection already %', lower(sc.connection_status);
  end if;
  if sc.id is null then
    insert into public.shop_customers(shop_id, customer_id, requested_by) values (s.id, uid, uid) returning * into sc;
  else
    update public.shop_customers set connection_status = 'PENDING', requested_by = uid, connected_at = null
    where id = sc.id returning * into sc;
  end if;
  select full_name into me from public.profiles where id = uid;
  perform public._notify(s.owner_id, 'New connection request', me || ' wants to connect to ' || s.shop_name,
    'CONNECTION_REQUEST', sc.id);
  return sc.id;
end $$;

create or replace function public.get_customer_by_token(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q public.customer_qr_tokens; p public.profiles;
begin
  perform public._require_auth();
  select * into q from public.customer_qr_tokens where token = trim(p_token);
  if q.id is null or not q.is_active then raise exception 'This QR code has been revoked or is invalid'; end if;
  if q.expires_at is not null and q.expires_at < now() then raise exception 'This QR code has expired'; end if;
  select * into p from public.profiles where id = q.user_id;
  return jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url);
end $$;

create or replace function public.request_customer_connection(p_shop_id uuid, p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); s public.shops; q public.customer_qr_tokens; sc public.shop_customers;
begin
  select * into s from public.shops where id = p_shop_id and owner_id = uid;
  if s.id is null then raise exception 'not allowed'; end if;
  select * into q from public.customer_qr_tokens where token = trim(p_token);
  if q.id is null or not q.is_active then raise exception 'This QR code has been revoked or is invalid'; end if;
  if q.expires_at is not null and q.expires_at < now() then raise exception 'This QR code has expired'; end if;
  if q.user_id = uid then raise exception 'You cannot add yourself as a customer'; end if;
  select * into sc from public.shop_customers where shop_id = s.id and customer_id = q.user_id for update;
  if sc.id is not null and sc.connection_status in ('PENDING','APPROVED') then
    raise exception 'Connection already %', lower(sc.connection_status);
  end if;
  if sc.id is null then
    insert into public.shop_customers(shop_id, customer_id, requested_by) values (s.id, q.user_id, uid) returning * into sc;
  else
    update public.shop_customers set connection_status = 'PENDING', requested_by = uid, connected_at = null
    where id = sc.id returning * into sc;
  end if;
  perform public._notify(q.user_id, 'Shop connection request', s.shop_name || ' wants to add you as a customer',
    'CONNECTION_REQUEST', sc.id);
  return sc.id;
end $$;

-- Only the counterparty of the requester may respond.
create or replace function public.respond_connection(p_connection_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); sc public.shop_customers; s public.shops; responder text;
begin
  select * into sc from public.shop_customers where id = p_connection_id for update;
  if sc.id is null then raise exception 'Request not found'; end if;
  select * into s from public.shops where id = sc.shop_id;
  if sc.connection_status <> 'PENDING' then raise exception 'Request already %', lower(sc.connection_status); end if;
  if sc.requested_by = sc.customer_id then
    if s.owner_id <> uid then raise exception 'not allowed'; end if;
  else
    if sc.customer_id <> uid then raise exception 'not allowed'; end if;
  end if;
  update public.shop_customers
     set connection_status = case when p_approve then 'APPROVED' else 'REJECTED' end,
         connected_at = case when p_approve then now() else null end
   where id = sc.id;
  select full_name into responder from public.profiles where id = uid;
  perform public._notify(sc.requested_by,
    case when p_approve then 'Connection approved' else 'Connection declined' end,
    case when sc.requested_by = sc.customer_id
         then s.shop_name || (case when p_approve then ' approved' else ' declined' end) || ' your request'
         else responder || (case when p_approve then ' approved' else ' declined' end) || ' your request from ' || s.shop_name end,
    case when p_approve then 'CONNECTION_APPROVED' else 'CONNECTION_REJECTED' end, sc.id);
end $$;

create or replace function public.disconnect_connection(p_connection_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); sc public.shop_customers;
begin
  select * into sc from public.shop_customers where id = p_connection_id for update;
  if sc.id is null or not (sc.customer_id = uid or public.is_shop_owner(sc.shop_id)) then raise exception 'not allowed'; end if;
  update public.shop_customers set connection_status = 'DISCONNECTED' where id = sc.id;
end $$;

create or replace function public.regenerate_customer_qr() returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); t text := encode(gen_random_bytes(24), 'hex');
begin
  update public.customer_qr_tokens set is_active = false where user_id = uid and is_active;
  insert into public.customer_qr_tokens(user_id, token) values (uid, t);
  return t;
end $$;

create or replace function public.revoke_customer_qr() returns void
language plpgsql security definer set search_path = public as $$
begin update public.customer_qr_tokens set is_active = false where user_id = public._require_auth() and is_active; end $$;

-- --------------------------------------------------------- purchase RPCs
-- p_items: [{"item_name":"Rice","quantity":2,"unit_price":100}]  (totals computed here)
create or replace function public.add_purchase(p_shop_id uuid, p_customer_id uuid, p_items jsonb,
  p_due_date date default null, p_notes text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); s public.shops; tx uuid; it jsonb; q numeric; u numeric;
        nm text; total numeric(12,2) := 0; sub numeric(12,2);
begin
  select * into s from public.shops where id = p_shop_id and owner_id = uid and is_active;
  if s.id is null then raise exception 'not allowed'; end if;
  if not public.is_approved(p_shop_id, p_customer_id) then raise exception 'Customer is not connected to this shop'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one item'; end if;
  if p_due_date is not null and p_due_date < current_date then raise exception 'Due date cannot be in the past'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    nm := trim(coalesce(it->>'item_name',''));
    q := (it->>'quantity')::numeric; u := (it->>'unit_price')::numeric;
    if nm = '' then raise exception 'Item name is required'; end if;
    if q is null or q <= 0 then raise exception 'Quantity must be positive'; end if;
    if u is null or u < 0 then raise exception 'Unit price cannot be negative'; end if;
    total := total + round(q * u, 2);
  end loop;
  if total <= 0 then raise exception 'Purchase total must be greater than zero'; end if;

  insert into public.transactions(shop_id, customer_id, total_amount, due_date, notes, created_by)
  values (p_shop_id, p_customer_id, total, p_due_date, nullif(trim(p_notes),''), uid) returning id into tx;

  for it in select * from jsonb_array_elements(p_items) loop
    q := (it->>'quantity')::numeric; u := (it->>'unit_price')::numeric; sub := round(q * u, 2);
    insert into public.transaction_items(transaction_id, item_name, quantity, unit_price, subtotal)
    values (tx, trim(it->>'item_name'), round(q, 2), round(u, 2), sub);
  end loop;

  insert into public.transaction_audit(transaction_id, action, actor_id) values (tx, 'CREATED', uid);
  perform public._notify(p_customer_id, 'New purchase at ' || s.shop_name,
    public._fmt(total) || ' added to your khata. Tap to review the items.', 'PURCHASE_ADDED', tx);
  return tx;
end $$;

create or replace function public.acknowledge_purchase(p_tx_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); t public.transactions; s public.shops; me text;
begin
  select * into t from public.transactions where id = p_tx_id for update;
  if t.id is null or t.customer_id <> uid or not public.is_approved(t.shop_id, uid) then raise exception 'not allowed'; end if;
  if t.transaction_status = 'VOIDED' then raise exception 'This purchase was cancelled'; end if;
  if t.acknowledgement_status = 'ACKNOWLEDGED' then return; end if;
  update public.transactions set acknowledgement_status = 'ACKNOWLEDGED', transaction_status = 'CONFIRMED' where id = t.id;
  insert into public.transaction_audit(transaction_id, action, actor_id) values (t.id, 'ACKNOWLEDGED', uid);
  select * into s from public.shops where id = t.shop_id;
  select full_name into me from public.profiles where id = uid;
  perform public._notify(s.owner_id, 'Purchase acknowledged', me || ' acknowledged ' || public._fmt(t.total_amount), 'PURCHASE_ACKNOWLEDGED', t.id);
end $$;

create or replace function public.raise_dispute(p_tx_id uuid, p_reason text, p_description text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); t public.transactions; s public.shops; d uuid; me text;
begin
  if p_reason is null or char_length(trim(p_reason)) = 0 then raise exception 'Please give a reason'; end if;
  select * into t from public.transactions where id = p_tx_id for update;
  if t.id is null or t.customer_id <> uid or not public.is_approved(t.shop_id, uid) then raise exception 'not allowed'; end if;
  if t.transaction_status = 'VOIDED' then raise exception 'This purchase was cancelled'; end if;
  if exists (select 1 from public.disputes where transaction_id = t.id and dispute_status = 'OPEN') then
    raise exception 'A dispute is already open for this purchase'; end if;
  insert into public.disputes(transaction_id, customer_id, shop_id, dispute_reason, description)
  values (t.id, uid, t.shop_id, trim(p_reason), nullif(trim(p_description),'')) returning id into d;
  update public.transactions set acknowledgement_status = 'DISPUTED', transaction_status = 'DISPUTED' where id = t.id;
  insert into public.transaction_audit(transaction_id, action, reason, actor_id) values (t.id, 'DISPUTED', trim(p_reason), uid);
  select * into s from public.shops where id = t.shop_id;
  select full_name into me from public.profiles where id = uid;
  perform public._notify(s.owner_id, 'Purchase disputed', me || ' disputed ' || public._fmt(t.total_amount) || ': ' || trim(p_reason), 'DISPUTE_RAISED', d);
  return d;
end $$;

-- Shopkeeper resolves: either void the purchase (auditable, never deleted) or uphold it.
create or replace function public.resolve_dispute(p_dispute_id uuid, p_void boolean, p_notes text default null) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); d public.disputes; t public.transactions; paid numeric;
begin
  select * into d from public.disputes where id = p_dispute_id for update;
  if d.id is null or not public.is_shop_owner(d.shop_id) then raise exception 'not allowed'; end if;
  if d.dispute_status <> 'OPEN' then raise exception 'Dispute already resolved'; end if;
  select * into t from public.transactions where id = d.transaction_id for update;
  if p_void then
    select coalesce(sum(a.allocated_amount),0) into paid from public.payment_allocations a
      join public.payments p on p.id = a.payment_id where a.transaction_id = t.id and p.verification_status = 'RECEIVED';
    if paid > 0 then raise exception 'Cannot cancel a purchase that already has verified payments'; end if;
    update public.transactions set transaction_status = 'VOIDED', acknowledgement_status = 'ACKNOWLEDGED' where id = t.id;
  else
    update public.transactions set transaction_status = 'CONFIRMED', acknowledgement_status = 'AWAITING' where id = t.id;
  end if;
  update public.disputes set dispute_status = case when p_void then 'RESOLVED_VOIDED' else 'RESOLVED_UPHELD' end,
         resolution_notes = nullif(trim(p_notes),''), resolved_by = uid, resolved_at = now() where id = d.id;
  insert into public.transaction_audit(transaction_id, action, reason, actor_id)
  values (t.id, case when p_void then 'VOIDED' else 'DISPUTE_UPHELD' end, nullif(trim(p_notes),''), uid);
  perform public._notify(d.customer_id, case when p_void then 'Purchase cancelled' else 'Dispute reviewed' end,
    case when p_void then 'The shop cancelled the disputed purchase.' else 'The shop reviewed your dispute and kept the purchase.' end,
    'DISPUTE_UPDATE', d.id);
end $$;

-- ---------------------------------------------------------- payment RPCs
create or replace function public._remaining(p_tx uuid) returns numeric
language sql stable set search_path = public as $$
  select t.total_amount - coalesce((select sum(a.allocated_amount) from public.payment_allocations a
    join public.payments p on p.id = a.payment_id where a.transaction_id = t.id and p.verification_status = 'RECEIVED'), 0)
  from public.transactions t where t.id = p_tx;
$$;

create or replace function public.declare_payment(p_shop_id uuid, p_amount numeric, p_method text,
  p_transaction_id uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); s public.shops; pid uuid; amt numeric(12,2); scope_rem numeric;
        pending numeric; me text; t public.transactions;
begin
  if p_method not in ('UPI','CASH') then raise exception 'Payment method must be UPI or CASH'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  amt := round(p_amount, 2);
  select * into s from public.shops where id = p_shop_id;
  if s.id is null then raise exception 'Shop not found'; end if;
  -- serialise this customer's declarations for this shop
  perform 1 from public.shop_customers where shop_id = p_shop_id and customer_id = uid
          and connection_status = 'APPROVED' for update;
  if not found then raise exception 'You are not connected to this shop'; end if;

  if p_transaction_id is not null then
    select * into t from public.transactions where id = p_transaction_id and shop_id = p_shop_id and customer_id = uid for update;
    if t.id is null then raise exception 'Purchase not found'; end if;
    if t.transaction_status = 'VOIDED' then raise exception 'This purchase was cancelled'; end if;
    scope_rem := public._remaining(t.id);
    select coalesce(sum(amount),0) into pending from public.payments
      where transaction_id = t.id and verification_status = 'PENDING';
  else
    select coalesce(sum(public._remaining(id)),0) into scope_rem from public.transactions
      where shop_id = p_shop_id and customer_id = uid and transaction_status <> 'VOIDED';
    select coalesce(sum(amount),0) into pending from public.payments
      where shop_id = p_shop_id and customer_id = uid and verification_status = 'PENDING';
  end if;
  if scope_rem <= 0 then raise exception 'Nothing is outstanding'; end if;
  if amt > scope_rem - pending then
    raise exception 'Amount exceeds the outstanding balance (%, with % already awaiting verification)',
      public._fmt(scope_rem), public._fmt(pending);
  end if;
  if exists (select 1 from public.payments where shop_id = p_shop_id and customer_id = uid
             and amount = amt and payment_method = p_method and verification_status = 'PENDING'
             and transaction_id is not distinct from p_transaction_id and declared_at > now() - interval '2 minutes') then
    raise exception 'This payment was already submitted'; end if;

  insert into public.payments(shop_id, customer_id, transaction_id, payment_type, amount, payment_method)
  values (p_shop_id, uid, p_transaction_id, case when p_transaction_id is null then 'OVERALL' else 'INDIVIDUAL' end, amt, p_method)
  returning id into pid;
  select full_name into me from public.profiles where id = uid;
  perform public._notify(s.owner_id, 'Payment to verify', me || ' declared ' || public._fmt(amt) || ' via ' || p_method,
    'PAYMENT_DECLARED', pid);
  return pid;
end $$;

-- p_allocations: optional [{"transaction_id": "...", "amount": 100}] — must sum to the payment amount.
create or replace function public.verify_payment(p_payment_id uuid, p_allocations jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); p public.payments; s public.shops; left_amt numeric(12,2);
        r record; take numeric(12,2); a jsonb; tx_id uuid; amt numeric(12,2); manual_total numeric(12,2) := 0;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if p.id is null or not public.is_shop_owner(p.shop_id) then raise exception 'not allowed'; end if;
  if p.verification_status <> 'PENDING' then raise exception 'Payment already %', lower(p.verification_status); end if;
  select * into s from public.shops where id = p.shop_id;
  left_amt := p.amount;

  -- lock this customer's open bills (oldest first) for the whole allocation
  perform 1 from public.transactions where shop_id = p.shop_id and customer_id = p.customer_id
    and transaction_status <> 'VOIDED' order by created_at, id for update;

  if p_allocations is not null and jsonb_typeof(p_allocations) = 'array' and jsonb_array_length(p_allocations) > 0 then
    for a in select * from jsonb_array_elements(p_allocations) loop
      tx_id := (a->>'transaction_id')::uuid; amt := round((a->>'amount')::numeric, 2);
      if amt is null or amt <= 0 then raise exception 'Allocation amounts must be positive'; end if;
      if not exists (select 1 from public.transactions where id = tx_id and shop_id = p.shop_id
                     and customer_id = p.customer_id and transaction_status <> 'VOIDED') then
        raise exception 'Allocation refers to an invalid purchase'; end if;
      if amt > public._remaining(tx_id) then raise exception 'Allocation exceeds the remaining bill amount'; end if;
      if exists (select 1 from jsonb_array_elements(p_allocations) x
                 where (x->>'transaction_id')::uuid = tx_id and x <> a) then
        raise exception 'Duplicate purchase in allocations'; end if;
      manual_total := manual_total + amt;
    end loop;
    if manual_total <> p.amount then raise exception 'Allocations must add up to exactly %', public._fmt(p.amount); end if;
    for a in select * from jsonb_array_elements(p_allocations) loop
      insert into public.payment_allocations(payment_id, transaction_id, allocated_amount)
      values (p.id, (a->>'transaction_id')::uuid, round((a->>'amount')::numeric, 2));
    end loop;
  else
    -- default: targeted bill first (INDIVIDUAL), then oldest unpaid first
    for r in
      select t.id, public._remaining(t.id) as rem
      from public.transactions t
      where t.shop_id = p.shop_id and t.customer_id = p.customer_id and t.transaction_status <> 'VOIDED'
      order by (t.id = p.transaction_id) desc, t.created_at, t.id
    loop
      exit when left_amt <= 0;
      continue when r.rem <= 0;
      take := least(left_amt, r.rem);
      insert into public.payment_allocations(payment_id, transaction_id, allocated_amount) values (p.id, r.id, take);
      left_amt := left_amt - take;
    end loop;
    if left_amt > 0 then raise exception 'Payment exceeds the customer''s outstanding balance'; end if;
  end if;

  update public.payments set verification_status = 'RECEIVED', verified_by = uid, verified_at = now() where id = p.id;
  perform public._notify(p.customer_id, 'Payment received',
    s.shop_name || ' confirmed your payment of ' || public._fmt(p.amount), 'PAYMENT_RECEIVED', p.id);
end $$;

create or replace function public.reject_payment(p_payment_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := public._require_auth(); p public.payments; s public.shops;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if p.id is null or not public.is_shop_owner(p.shop_id) then raise exception 'not allowed'; end if;
  if p.verification_status <> 'PENDING' then raise exception 'Payment already %', lower(p.verification_status); end if;
  select * into s from public.shops where id = p.shop_id;
  update public.payments set verification_status = 'REJECTED', rejection_reason = nullif(trim(p_reason),''),
         verified_by = uid, verified_at = now() where id = p.id;
  perform public._notify(p.customer_id, 'Payment not accepted',
    s.shop_name || ' did not accept your payment of ' || public._fmt(p.amount) ||
    coalesce(': ' || nullif(trim(p_reason),''), ''), 'PAYMENT_REJECTED', p.id);
end $$;

-- Digital receipt for a RECEIVED payment (visible to the customer and the shop owner).
create or replace function public.get_receipt(p_payment_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := public._require_auth(); p public.payments; s public.shops; c public.profiles; allocs jsonb;
begin
  select * into p from public.payments where id = p_payment_id;
  if p.id is null or not (p.customer_id = uid or public.is_shop_owner(p.shop_id)) then raise exception 'not allowed'; end if;
  if p.verification_status <> 'RECEIVED' then raise exception 'Receipt available after the shop confirms payment'; end if;
  select * into s from public.shops where id = p.shop_id;
  select * into c from public.profiles where id = p.customer_id;
  select coalesce(jsonb_agg(jsonb_build_object('transaction_id', a.transaction_id, 'amount', a.allocated_amount,
         'bill_date', t.created_at) order by t.created_at), '[]') into allocs
    from public.payment_allocations a join public.transactions t on t.id = a.transaction_id where a.payment_id = p.id;
  return jsonb_build_object('receipt_no', 'KC-' || upper(left(replace(p.id::text,'-',''), 8)),
    'shop_name', s.shop_name, 'shop_code', s.shop_code, 'customer_name', c.full_name, 'amount', p.amount,
    'method', p.payment_method, 'declared_at', p.declared_at, 'verified_at', p.verified_at, 'allocations', allocs);
end $$;

-- ------------------------------------------------------------- dashboards
create or replace function public.customer_shop_summaries() returns table(
  connection_id uuid, shop_id uuid, shop_name text, category text, shop_code text, profile_image_url text,
  outstanding numeric, unpaid_count bigint, next_due date, overdue_count bigint)
language sql stable security invoker set search_path = public as $$
  select sc.id, s.id, s.shop_name, s.category, s.shop_code, s.profile_image_url,
    coalesce(sum(b.remaining_amount) filter (where b.remaining_amount > 0), 0),
    count(*) filter (where b.remaining_amount > 0),
    min(b.due_date) filter (where b.remaining_amount > 0 and b.due_date >= current_date),
    count(*) filter (where b.remaining_amount > 0 and b.due_date < current_date)
  from public.shop_customers sc
  join public.shops s on s.id = sc.shop_id
  left join public.transaction_balances b on b.shop_id = s.id and b.customer_id = sc.customer_id
       and b.transaction_status <> 'VOIDED'
  where sc.customer_id = auth.uid() and sc.connection_status = 'APPROVED'
  group by sc.id, s.id order by 7 desc, s.shop_name;
$$;

create or replace function public.customer_dashboard() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'total_outstanding', coalesce(sum(b.remaining_amount) filter (where b.remaining_amount > 0), 0),
    'overdue_amount', coalesce(sum(b.remaining_amount) filter (where b.remaining_amount > 0 and b.due_date < current_date), 0),
    'overdue_count', count(*) filter (where b.remaining_amount > 0 and b.due_date < current_date),
    'shop_count', (select count(*) from public.shop_customers where customer_id = auth.uid() and connection_status = 'APPROVED'),
    'pending_declarations', (select count(*) from public.payments where customer_id = auth.uid() and verification_status = 'PENDING'))
  from public.transaction_balances b
  where b.customer_id = auth.uid() and b.transaction_status <> 'VOIDED'
    and public.is_approved(b.shop_id, b.customer_id);
$$;

create or replace function public.shop_dashboard(p_shop_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare tz text := 'Asia/Kolkata'; r jsonb;
begin
  if not public.is_shop_owner(p_shop_id) then raise exception 'not allowed'; end if;
  select jsonb_build_object(
    'total_outstanding', coalesce(sum(b.remaining_amount) filter (where b.remaining_amount > 0), 0),
    'overdue_amount', coalesce(sum(b.remaining_amount) filter (where b.remaining_amount > 0 and b.due_date < current_date), 0),
    'unpaid_count', count(*) filter (where b.remaining_amount > 0))
  into r from public.transaction_balances b where b.shop_id = p_shop_id and b.transaction_status <> 'VOIDED';
  return r || jsonb_build_object(
    'collected_today', (select coalesce(sum(amount),0) from public.payments where shop_id = p_shop_id
        and verification_status = 'RECEIVED' and (verified_at at time zone tz)::date = (now() at time zone tz)::date),
    'collected_month', (select coalesce(sum(amount),0) from public.payments where shop_id = p_shop_id
        and verification_status = 'RECEIVED' and date_trunc('month', verified_at at time zone tz) = date_trunc('month', now() at time zone tz)),
    'pending_verifications', (select count(*) from public.payments where shop_id = p_shop_id and verification_status = 'PENDING'),
    'customer_count', (select count(*) from public.shop_customers where shop_id = p_shop_id and connection_status = 'APPROVED'));
end $$;

create or replace function public.shop_customer_summaries(p_shop_id uuid) returns table(
  customer_id uuid, full_name text, phone text, outstanding numeric, total_purchases numeric,
  last_purchase timestamptz, pending_declarations bigint, overdue_count bigint)
language plpgsql stable security invoker set search_path = public as $$
begin
  if not public.is_shop_owner(p_shop_id) then raise exception 'not allowed'; end if;
  return query
  select p.id, p.full_name, p.phone,
    coalesce(sum(b.remaining_amount) filter (where b.remaining_amount > 0), 0),
    coalesce(sum(b.total_amount), 0), max(b.created_at),
    (select count(*) from public.payments pp where pp.shop_id = p_shop_id and pp.customer_id = p.id and pp.verification_status = 'PENDING'),
    count(*) filter (where b.remaining_amount > 0 and b.due_date < current_date)
  from public.shop_customers sc
  join public.profiles p on p.id = sc.customer_id
  left join public.transaction_balances b on b.shop_id = sc.shop_id and b.customer_id = sc.customer_id and b.transaction_status <> 'VOIDED'
  where sc.shop_id = p_shop_id and sc.connection_status = 'APPROVED'
  group by p.id order by 4 desc, p.full_name;
end $$;

create or replace function public.shop_report(p_shop_id uuid, p_from date, p_to date) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare tz text := 'Asia/Kolkata';
begin
  if not public.is_shop_owner(p_shop_id) then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'credit_given', (select coalesce(sum(total_amount),0) from public.transactions where shop_id = p_shop_id
        and transaction_status <> 'VOIDED' and (created_at at time zone tz)::date between p_from and p_to),
    'collected_upi', (select coalesce(sum(amount),0) from public.payments where shop_id = p_shop_id and verification_status = 'RECEIVED'
        and payment_method = 'UPI' and (verified_at at time zone tz)::date between p_from and p_to),
    'collected_cash', (select coalesce(sum(amount),0) from public.payments where shop_id = p_shop_id and verification_status = 'RECEIVED'
        and payment_method = 'CASH' and (verified_at at time zone tz)::date between p_from and p_to),
    'daily', (select coalesce(jsonb_agg(d order by d->>'day'), '[]') from (
        select jsonb_build_object('day', (verified_at at time zone tz)::date, 'amount', sum(amount)) d
        from public.payments where shop_id = p_shop_id and verification_status = 'RECEIVED'
          and (verified_at at time zone tz)::date between p_from and p_to group by (verified_at at time zone tz)::date) x));
end $$;

-- ------------------------------------------------------------- reminders
-- Run daily by pg_cron / Edge Function with the service role. Duplicate-safe via dedupe_key.
create or replace function public.process_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; bucket int;
begin
  for r in
    select b.transaction_id, b.customer_id, b.due_date, b.remaining_amount, s.id as shop_id, s.owner_id, s.shop_name,
           rs.reminder_days_before, rs.reminder_days_after, p.full_name
    from public.transaction_balances b
    join public.shops s on s.id = b.shop_id
    join public.shop_reminder_settings rs on rs.shop_id = s.id and rs.reminder_enabled
    join public.profiles p on p.id = b.customer_id
    where b.remaining_amount > 0 and b.transaction_status <> 'VOIDED' and b.due_date is not null
      and public.is_approved(b.shop_id, b.customer_id)
  loop
    if r.due_date >= current_date and r.due_date - current_date <= r.reminder_days_before then
      perform public._notify(r.customer_id, 'Payment due soon',
        public._fmt(r.remaining_amount) || ' is due at ' || r.shop_name || ' on ' || to_char(r.due_date, 'DD Mon'),
        'PAYMENT_DUE_SOON', r.transaction_id, 'due_soon:' || r.transaction_id);
      n := n + 1;
    elsif r.due_date < current_date then
      bucket := (current_date - r.due_date) / r.reminder_days_after;
      perform public._notify(r.customer_id, 'Payment overdue',
        public._fmt(r.remaining_amount) || ' at ' || r.shop_name || ' was due on ' || to_char(r.due_date, 'DD Mon'),
        'PAYMENT_OVERDUE', r.transaction_id, 'overdue:' || r.transaction_id || ':' || bucket);
      perform public._notify(r.owner_id, 'Payment overdue',
        r.full_name || ' has ' || public._fmt(r.remaining_amount) || ' overdue since ' || to_char(r.due_date, 'DD Mon'),
        'PAYMENT_OVERDUE', r.transaction_id, 'overdue_owner:' || r.transaction_id || ':' || bucket);
      n := n + 2;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.process_reminders() from public, anon, authenticated;

-- Grant RPC execution to signed-in users only.
do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in (
    'create_shop','regenerate_shop_qr','get_shop_preview','request_shop_connection','get_customer_by_token',
    'request_customer_connection','respond_connection','disconnect_connection','regenerate_customer_qr',
    'revoke_customer_qr','add_purchase','acknowledge_purchase','raise_dispute','resolve_dispute',
    'declare_payment','verify_payment','reject_payment','get_receipt','customer_shop_summaries',
    'customer_dashboard','shop_dashboard','shop_customer_summaries','shop_report','is_shop_owner','is_approved')
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Realtime for in-app updates
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.shop_customers;
