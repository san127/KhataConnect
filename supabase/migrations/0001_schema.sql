-- KhataConnect schema. Money is NUMERIC(12,2); balances are always derived.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  avatar_url text,
  notification_prefs jsonb not null default
    '{"purchases":true,"payments":true,"connections":true,"reminders":true,"disputes":true}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- shops
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  shop_name text not null check (char_length(trim(shop_name)) > 0),
  owner_name text,
  contact_phone text,
  shop_code text not null unique,
  qr_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  category text,
  address text,
  description text,
  profile_image_url text,
  cover_image_url text,
  upi_qr_url text,
  is_active boolean not null default true,
  verification_status text not null default 'UNVERIFIED'
    check (verification_status in ('UNVERIFIED','VERIFIED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shops_owner_idx on public.shops(owner_id);

-- ----------------------------------------------------------- shop_customers
create table public.shop_customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  connection_status text not null default 'PENDING'
    check (connection_status in ('PENDING','APPROVED','REJECTED','DISCONNECTED')),
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (shop_id, customer_id)
);
create index shop_customers_customer_idx on public.shop_customers(customer_id);

-- -------------------------------------------------------- customer_qr_tokens
create table public.customer_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index customer_qr_one_active on public.customer_qr_tokens(user_id) where is_active;

-- ------------------------------------------------------------- transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id),
  customer_id uuid not null references public.profiles(id),
  total_amount numeric(12,2) not null check (total_amount > 0),
  due_date date,
  notes text,
  transaction_status text not null default 'CONFIRMED'
    check (transaction_status in ('CONFIRMED','DISPUTED','VOIDED')),
  acknowledgement_status text not null default 'AWAITING'
    check (acknowledgement_status in ('AWAITING','ACKNOWLEDGED','DISPUTED')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_shop_idx on public.transactions(shop_id, created_at desc);
create index transactions_customer_idx on public.transactions(customer_id, created_at desc);
create index transactions_due_idx on public.transactions(due_date);

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  item_name text not null check (char_length(trim(item_name)) > 0),
  quantity numeric(10,2) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);
create index transaction_items_tx_idx on public.transaction_items(transaction_id);

-- Auditable trail: confirmed purchases are never edited/deleted, only voided with a reason.
create table public.transaction_audit (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id),
  action text not null,
  reason text,
  actor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id),
  customer_id uuid not null references public.profiles(id),
  transaction_id uuid references public.transactions(id), -- set for INDIVIDUAL
  payment_type text not null check (payment_type in ('INDIVIDUAL','OVERALL')),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('UPI','CASH')),
  verification_status text not null default 'PENDING'
    check (verification_status in ('PENDING','RECEIVED','REJECTED')),
  rejection_reason text,
  declared_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((payment_type = 'INDIVIDUAL') = (transaction_id is not null))
);
create index payments_shop_idx on public.payments(shop_id, verification_status);
create index payments_customer_idx on public.payments(customer_id, created_at desc);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  transaction_id uuid not null references public.transactions(id),
  allocated_amount numeric(12,2) not null check (allocated_amount > 0),
  created_at timestamptz not null default now()
);
create index alloc_tx_idx on public.payment_allocations(transaction_id);
create index alloc_payment_idx on public.payment_allocations(payment_id);

-- ----------------------------------------------------------------- disputes
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id),
  customer_id uuid not null references public.profiles(id),
  shop_id uuid not null references public.shops(id),
  dispute_reason text not null,
  description text,
  dispute_status text not null default 'OPEN'
    check (dispute_status in ('OPEN','RESOLVED_VOIDED','RESOLVED_UPHELD')),
  resolution_notes text,
  resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index disputes_shop_idx on public.disputes(shop_id, dispute_status);
create unique index disputes_one_open on public.disputes(transaction_id) where dispute_status = 'OPEN';

-- ------------------------------------------------------------ notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text not null,
  related_id uuid,
  dedupe_key text,
  is_read boolean not null default false,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create unique index notifications_dedupe on public.notifications(user_id, dedupe_key) where dedupe_key is not null;

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fcm_token text not null unique,
  device_type text check (device_type in ('android','ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_reminder_settings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique references public.shops(id) on delete cascade,
  reminder_enabled boolean not null default true,
  reminder_days_before integer not null default 2 check (reminder_days_before between 0 and 30),
  reminder_days_after integer not null default 3 check (reminder_days_after between 1 and 60),
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------- derived balances
-- Remaining = total - SUM(allocations whose payment is RECEIVED). Never stored.
create view public.transaction_balances with (security_invoker = true) as
select t.id as transaction_id, t.shop_id, t.customer_id, t.total_amount, t.due_date,
       t.created_at, t.transaction_status, t.acknowledgement_status,
       coalesce(sum(a.allocated_amount) filter (where p.verification_status = 'RECEIVED'), 0)::numeric(12,2) as paid_amount,
       (t.total_amount - coalesce(sum(a.allocated_amount) filter (where p.verification_status = 'RECEIVED'), 0))::numeric(12,2) as remaining_amount
from public.transactions t
left join public.payment_allocations a on a.transaction_id = t.id
left join public.payments p on p.id = a.payment_id
group by t.id;

-- --------------------------------------------------------------- triggers
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger shops_touch before update on public.shops for each row execute function public.touch_updated_at();
create trigger tx_touch before update on public.transactions for each row execute function public.touch_updated_at();
create trigger push_touch before update on public.push_tokens for each row execute function public.touch_updated_at();

-- Profile + customer QR token created automatically on sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, phone, email)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'full_name',''), 'KhataConnect User'),
          coalesce(nullif(new.phone,''), nullif(new.raw_user_meta_data->>'phone','')), nullif(new.email,''))
  on conflict (id) do nothing;
  insert into public.customer_qr_tokens(user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile contact info in sync when auth email/phone is confirmed or changed.
create or replace function public.sync_profile_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = nullif(new.email,''), phone = nullif(new.phone,'') where id = new.id;
  return new;
end $$;
create trigger on_auth_user_updated after update of email, phone on auth.users
  for each row execute function public.sync_profile_contact();

-- Financial rows are append-only from the client's perspective.
create or replace function public.block_item_changes() returns trigger
language plpgsql set search_path = public as $$
begin raise exception 'transaction items are immutable'; end $$;
create trigger items_immutable before update or delete on public.transaction_items
  for each row execute function public.block_item_changes();

create or replace function public.block_tx_money_changes() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.total_amount <> old.total_amount or new.shop_id <> old.shop_id
     or new.customer_id <> old.customer_id or new.created_by <> old.created_by then
    raise exception 'confirmed purchase amounts cannot be modified';
  end if;
  return new;
end $$;
create trigger tx_no_money_edit before update on public.transactions
  for each row execute function public.block_tx_money_changes();

create or replace function public.block_allocation_changes() returns trigger
language plpgsql set search_path = public as $$
begin raise exception 'payment allocations are immutable'; end $$;
create trigger alloc_immutable before update or delete on public.payment_allocations
  for each row execute function public.block_allocation_changes();
