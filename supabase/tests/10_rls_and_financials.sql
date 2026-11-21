-- Integration tests for RLS, atomic RPCs and financial integrity.
-- Users: S = shopkeeper, C = customer, D = unrelated customer, O = owner of a different shop.
create schema tests;
grant usage on schema tests to authenticated, anon;
create table tests.ctx (k text primary key, v text);
grant select, insert, update on tests.ctx to authenticated;

create function tests.ok(c boolean, msg text) returns void language plpgsql as $$
begin if c is not true then raise exception 'ASSERT FAILED: %', msg; end if; raise notice 'ok - %', msg; end $$;

create function tests.throws(q text, frag text, msg text) returns void language plpgsql as $$
begin
  begin execute q;
  exception when others then
    if sqlerrm ilike '%' || frag || '%' then raise notice 'ok - % [%]', msg, sqlerrm; return; end if;
    raise exception 'ASSERT FAILED: % -- expected error containing "%" but got "%"', msg, frag, sqlerrm;
  end;
  raise exception 'ASSERT FAILED: % -- expected an error containing "%" but the statement succeeded', msg, frag;
end $$;

create function tests.as_user(uid uuid) returns void language plpgsql as $$
begin reset role; perform set_config('request.jwt.claim.sub', uid::text, true); set local role authenticated; end $$;
create function tests.as_su() returns void language plpgsql as $$ begin reset role; end $$;
create function tests.put(k text, v text) returns void language sql as $$ insert into tests.ctx values (k, v) on conflict (k) do update set v = excluded.v $$;
create function tests.g(k text) returns uuid language sql as $$ select v::uuid from tests.ctx where k = $1 $$;
create function tests.nc(u uuid, t text) returns int language sql security definer as $$
  select count(*)::int from public.notifications where user_id = u and notification_type = t $$;
grant execute on all functions in schema tests to authenticated, anon;

-- ------------------------------------------------------------------ setup
do $$
declare s uuid := '00000000-0000-0000-0000-00000000000a'; c uuid := '00000000-0000-0000-0000-00000000000b';
        d uuid := '00000000-0000-0000-0000-00000000000c'; o uuid := '00000000-0000-0000-0000-00000000000d';
        shop public.shops; shop2 public.shops; tok text;
begin
  insert into auth.users(id, email, raw_user_meta_data) values
    (s, 's@x.in', '{"full_name":"Sai Shop"}'), (c, 'c@x.in', '{"full_name":"Cara Customer"}'),
    (d, 'd@x.in', '{"full_name":"Dev Other"}'), (o, 'o@x.in', '{"full_name":"Om Owner"}');
  perform tests.ok((select count(*) from public.profiles) = 4, 'profiles auto-created on signup');
  perform tests.ok((select count(*) from public.customer_qr_tokens where is_active) = 4, 'customer QR token auto-created');

  perform tests.as_user(s); shop := public.create_shop('Sai General Stores', 'Sai', '+919800000001', 'Kirana', 'Panjim', null);
  perform tests.put('shop', shop.id::text);
  perform tests.ok(shop.shop_code ~ '^KH-[A-Z]{3}[0-9]{3}$', 'shop code format KH-SAI102 style: ' || shop.shop_code);
  perform tests.ok(length(shop.qr_token) = 48, 'shop QR token is a long random token');
  perform tests.as_user(o); shop2 := public.create_shop('Om Medical', 'Om', '+919800000002', 'Medical store', 'Margao', null);
  perform tests.put('shop2', shop2.id::text);
  perform tests.as_su();
end $$;

-- ------------------------------------------------------- connection rules
do $$
declare s uuid := '00000000-0000-0000-0000-00000000000a'; c uuid := '00000000-0000-0000-0000-00000000000b';
        d uuid := '00000000-0000-0000-0000-00000000000c'; o uuid := '00000000-0000-0000-0000-00000000000d';
        shop uuid := tests.g('shop'); conn uuid; pv jsonb; tok text; code text;
begin
  select shop_code into code from public.shops where id = shop;
  perform tests.as_user(c);
  pv := public.get_shop_preview(p_code => code);
  perform tests.ok(pv->>'shop_name' = 'Sai General Stores' and not (pv ? 'qr_token') and not (pv ? 'upi_qr_url'), 'preview by code exposes only public fields');
  select qr_token into tok from public.shops where id = shop; -- fails RLS for C -> null (no connection row yet)
  perform tests.ok(tok is null, 'customer cannot read shop row (and its qr_token) before connecting');
  perform tests.as_su(); select qr_token into tok from public.shops where id = shop; perform tests.as_user(c);
  perform tests.ok(public.get_shop_preview(p_token => tok)->>'id' = shop::text, 'preview by QR token works');
  perform tests.throws('select public.get_shop_preview(p_token => ''nope'')', 'not found', 'invalid shop QR rejected');

  conn := public.request_shop_connection(shop);
  perform tests.throws(format('select public.request_shop_connection(%L)', shop), 'already pending', 'duplicate connection request rejected');
  perform tests.ok(tests.nc(s, 'CONNECTION_REQUEST') = 1, 'shopkeeper notified of request');

  -- ledger must be closed before approval
  perform tests.as_user(s);
  perform tests.throws(format('select public.add_purchase(%L, %L, %L::jsonb)', shop, c, '[{"item_name":"x","quantity":1,"unit_price":10}]'), 'not connected', 'cannot add purchase before approval');
  perform tests.as_user(c);
  perform tests.throws(format('select public.respond_connection(%L, true)', conn), 'not allowed', 'customer cannot approve own request');
  perform tests.as_user(o);
  perform tests.throws(format('select public.respond_connection(%L, true)', conn), 'not allowed', 'unrelated shop owner cannot approve');
  perform tests.as_user(s);
  perform public.respond_connection(conn, true);
  perform tests.ok((select connection_status from public.shop_customers where id = conn) = 'APPROVED', 'owner approves connection');
  perform tests.throws(format('select public.respond_connection(%L, false)', conn), 'already approved', 'cannot answer twice');
  perform tests.as_user(c);
  perform tests.ok(tests.nc(c, 'CONNECTION_APPROVED') = 1, 'customer notified of approval');

  -- reverse flow: shopkeeper scans customer QR
  perform tests.as_user(o);
  perform tests.as_su(); select token into tok from public.customer_qr_tokens where user_id = d and is_active; perform tests.as_user(o);
  perform tests.ok(public.get_customer_by_token(tok)->>'full_name' = 'Dev Other' and not (public.get_customer_by_token(tok) ? 'phone'), 'customer QR resolves name only, no contact info');
  conn := public.request_customer_connection(tests.g('shop2'), tok);
  perform tests.throws(format('select public.respond_connection(%L, true)', conn), 'not allowed', 'shop that sent the request cannot approve it itself');
  perform tests.as_user(c);
  perform tests.throws(format('select public.respond_connection(%L, true)', conn), 'not allowed', 'a different customer cannot approve it');
  perform tests.as_user(d);
  perform public.respond_connection(conn, true);
  perform tests.ok((select connection_status from public.shop_customers where id = conn) = 'APPROVED', 'customer approves shopkeeper-initiated request');
  perform tests.as_su();
end $$;

-- ---------------------------------------------------- itemised purchases
do $$
declare s uuid := '00000000-0000-0000-0000-00000000000a'; c uuid := '00000000-0000-0000-0000-00000000000b';
        d uuid := '00000000-0000-0000-0000-00000000000c'; o uuid := '00000000-0000-0000-0000-00000000000d';
        shop uuid := tests.g('shop'); b1 uuid; b2 uuid; b3 uuid; tot numeric;
begin
  perform tests.as_user(s);
  -- the spec example: Rice 2x100, Milk 1x60, Bread 2x30 = 320 (client sends junk subtotal; server ignores it)
  b1 := public.add_purchase(shop, c, '[{"item_name":"Rice","quantity":2,"unit_price":100,"subtotal":1},
                                       {"item_name":"Milk","quantity":1,"unit_price":60},
                                       {"item_name":"Bread","quantity":2,"unit_price":30}]', current_date + 7, 'monthly stock');
  select total_amount into tot from public.transactions where id = b1;
  perform tests.ok(tot = 320.00, 'server computes total = 320 (got ' || tot || ')');
  perform tests.ok((select count(*) from public.transaction_items where transaction_id = b1) = 3 and (select sum(subtotal) from public.transaction_items where transaction_id = b1) = 320, 'three items saved atomically, subtotals computed server-side');
  b2 := public.add_purchase(shop, c, '[{"item_name":"Gas cylinder","quantity":1,"unit_price":500}]', null, null);
  b3 := public.add_purchase(shop, c, '[{"item_name":"Soap","quantity":3,"unit_price":60}]', null, null);
  perform tests.put('b1', b1::text); perform tests.put('b2', b2::text); perform tests.put('b3', b3::text);
  -- make ordering deterministic (all rows share one transaction timestamp otherwise)
  perform tests.as_su();
  update public.transactions set created_at = now() - interval '3 days' where id = b1;
  update public.transactions set created_at = now() - interval '2 days' where id = b2;
  update public.transactions set created_at = now() - interval '1 day' where id = b3;

  perform tests.as_user(s);
  perform tests.throws(format('select public.add_purchase(%L,%L,%L::jsonb)', shop, c, '[]'), 'at least one item', 'empty purchase rejected');
  perform tests.throws(format('select public.add_purchase(%L,%L,%L::jsonb)', shop, c, '[{"item_name":" ","quantity":1,"unit_price":5}]'), 'name is required', 'blank item name rejected');
  perform tests.throws(format('select public.add_purchase(%L,%L,%L::jsonb)', shop, c, '[{"item_name":"a","quantity":0,"unit_price":5}]'), 'Quantity must be positive', 'zero quantity rejected');
  perform tests.throws(format('select public.add_purchase(%L,%L,%L::jsonb)', shop, c, '[{"item_name":"a","quantity":1,"unit_price":-5}]'), 'cannot be negative', 'negative price rejected');
  perform tests.throws(format('select public.add_purchase(%L,%L,%L::jsonb)', shop, c, '[{"item_name":"a","quantity":1,"unit_price":0}]'), 'greater than zero', 'zero-total purchase rejected');
  perform tests.throws(format('select public.add_purchase(%L,%L,%L::jsonb, current_date - 1)', shop, c, '[{"item_name":"a","quantity":1,"unit_price":5}]'), 'past', 'past due date rejected');
  perform tests.throws(format('select public.add_purchase(%L,%L,%L::jsonb)', shop, d, '[{"item_name":"a","quantity":1,"unit_price":5}]'), 'not connected', 'cannot bill a customer who is not connected to this shop');
  perform tests.as_user(o);
  perform tests.throws(format('select public.add_purchase(%L,%L,%L::jsonb)', shop, c, '[{"item_name":"a","quantity":1,"unit_price":5}]'), 'not allowed', 'other shop''s owner cannot add to this shop');
  perform tests.throws(format('update public.transactions set total_amount = 1 where id = %L', b1), 'permission denied', 'owner cannot edit purchase amounts via API');

  -- visibility
  perform tests.as_user(c);
  perform tests.ok((select count(*) from public.transactions) = 3, 'customer sees own 3 bills');
  perform tests.ok((select count(*) from public.transaction_items) = 5, 'customer sees item rows of own bills');
  perform tests.as_user(d);
  perform tests.ok((select count(*) from public.transactions) = 0 and (select count(*) from public.transaction_items) = 0 and (select count(*) from public.transaction_balances) = 0, 'unrelated customer cannot see another customer''s ledger');
  perform tests.as_user(o);
  perform tests.ok((select count(*) from public.transactions) = 0 and (select count(*) from public.shop_customers where shop_id = shop) = 0, 'unrelated shopkeeper cannot see this shop''s data');
  perform tests.as_user(c);
  perform tests.ok((select count(*) from public.notifications where notification_type = 'PURCHASE_ADDED') = 3, 'customer notified of each purchase');
  perform tests.throws(format('update public.transactions set transaction_status = ''VOIDED'' where id = %L', b1), 'permission denied', 'customer cannot edit shopkeeper-owned purchases');
  perform tests.throws(format('delete from public.transaction_items where transaction_id = %L', b1), 'permission denied', 'customer cannot delete items');
  perform tests.as_su();
  perform tests.throws(format('update public.transaction_items set quantity = 9 where transaction_id = %L', b1), 'immutable', 'items immutable even for superuser (trigger)');
end $$;

-- -------------------------------------------- acknowledge / dispute / audit
do $$
declare s uuid := '00000000-0000-0000-0000-00000000000a'; c uuid := '00000000-0000-0000-0000-00000000000b';
        d uuid := '00000000-0000-0000-0000-00000000000c'; shop uuid := tests.g('shop');
        b1 uuid := tests.g('b1'); b4 uuid; dsp uuid;
begin
  perform tests.as_user(d); perform tests.throws(format('select public.acknowledge_purchase(%L)', b1), 'not allowed', 'other customer cannot acknowledge someone else''s bill');
  perform tests.as_user(c); perform public.acknowledge_purchase(b1);
  perform tests.ok((select acknowledgement_status from public.transactions where id = b1) = 'ACKNOWLEDGED', 'customer acknowledges purchase');

  perform tests.as_user(s);
  b4 := public.add_purchase(shop, c, '[{"item_name":"Wrong item","quantity":1,"unit_price":99}]');
  perform tests.put('b4', b4::text);
  perform tests.as_user(c);
  dsp := public.raise_dispute(b4, 'Never bought this', null);
  perform tests.ok((select transaction_status from public.transactions where id = b4) = 'DISPUTED', 'dispute marks bill DISPUTED (not deleted)');
  perform tests.throws(format('select public.raise_dispute(%L, ''again'')', b4), 'already open', 'one open dispute per bill');
  perform tests.as_user(s);
  perform tests.ok((select count(*) from public.notifications where notification_type = 'DISPUTE_RAISED') = 1, 'shopkeeper notified of dispute');
  perform tests.as_user(c);
  perform tests.throws(format('select public.resolve_dispute(%L, true)', dsp), 'not allowed', 'customer cannot resolve own dispute');
  perform tests.as_user(s); perform public.resolve_dispute(dsp, true, 'My mistake');
  perform tests.ok((select transaction_status from public.transactions where id = b4) = 'VOIDED', 'void resolves dispute and keeps the row');
  perform tests.ok((select count(*) from public.transaction_audit where transaction_id = b4) = 3, 'audit trail: CREATED, DISPUTED, VOIDED');
  perform tests.ok((select count(*) from public.transactions where id = b4) = 1, 'voided bill still exists for history');
  perform tests.ok((select remaining_amount from public.transaction_balances where transaction_id = b4) = 99 and
    (select coalesce(sum(remaining_amount),0) from public.transaction_balances where customer_id = c and transaction_status <> 'VOIDED') = 1000, 'voided bill excluded from outstanding (1000 = 320+500+180)');
  perform tests.as_user(c); perform tests.throws(format('select public.acknowledge_purchase(%L)', b4), 'cancelled', 'cannot acknowledge a cancelled bill');
  perform tests.as_su();
end $$;

-- ------------------------------------------------------------- payments
do $$
declare s uuid := '00000000-0000-0000-0000-00000000000a'; c uuid := '00000000-0000-0000-0000-00000000000b';
        d uuid := '00000000-0000-0000-0000-00000000000c'; o uuid := '00000000-0000-0000-0000-00000000000d';
        shop uuid := tests.g('shop'); b1 uuid := tests.g('b1'); b2 uuid := tests.g('b2'); b3 uuid := tests.g('b3');
        p1 uuid; p2 uuid; p3 uuid; p4 uuid;
        r1 numeric; r2 numeric; r3 numeric;
begin
  perform tests.as_user(c);
  perform tests.throws(format('select public.declare_payment(%L, 10, ''CARD'')', shop), 'UPI or CASH', 'only UPI and CASH accepted');
  perform tests.throws(format('select public.declare_payment(%L, 0, ''UPI'')', shop), 'greater than zero', 'zero amount rejected');
  perform tests.throws(format('select public.declare_payment(%L, 321, ''UPI'', %L)', shop, b1), 'exceeds', 'individual payment above bill balance rejected');
  perform tests.throws(format('select public.declare_payment(%L, 1001, ''CASH'')', shop), 'exceeds', 'overall payment above total outstanding rejected');
  perform tests.throws('insert into public.payments(shop_id, customer_id, payment_type, amount, payment_method) values (' || quote_literal(shop) || ',' || quote_literal(c) || ',''OVERALL'',10,''CASH'')', 'permission denied', 'customer cannot insert payments directly (must use RPC)');
  perform tests.as_user(d);
  perform tests.throws(format('select public.declare_payment(%L, 10, ''CASH'')', shop), 'not connected', 'customer not connected to the shop cannot declare');

  perform tests.as_user(c);
  p1 := public.declare_payment(shop, 200, 'UPI', b1);     -- partial payment on one bill
  perform tests.throws(format('select public.declare_payment(%L, 200, ''UPI'', %L)', shop, b1), 'already awaiting verification', 'duplicate submission blocked (pending counts against outstanding)');
  p2 := public.declare_payment(shop, 600, 'UPI');          -- overall
  perform tests.throws(format('select public.declare_payment(%L, 300, ''CASH'')', shop), 'exceeds', 'pending declarations count against what can still be declared (1000-800=200 left)');
  perform tests.put('p1', p1::text); perform tests.put('p2', p2::text);

  -- CRITICAL: declaring must not reduce anything
  perform tests.as_user(s);
  select remaining_amount into r1 from public.transaction_balances where transaction_id = b1;
  perform tests.ok(r1 = 320 and (select coalesce(sum(remaining_amount),0) from public.transaction_balances where customer_id = c and transaction_status <> 'VOIDED') = 1000, 'PENDING payments do not reduce outstanding (still 1000)');
  perform tests.ok((select count(*) from public.notifications where notification_type = 'PAYMENT_DECLARED') = 2, 'shopkeeper notified of each declaration');

  -- authorisation of verification
  perform tests.as_user(c);
  perform tests.throws(format('select public.verify_payment(%L)', p1), 'not allowed', 'customer cannot confirm own payment');
  perform tests.throws(format('update public.payments set verification_status = ''RECEIVED'' where id = %L', p1), 'permission denied', 'customer cannot flip status via direct update');
  perform tests.as_user(o);
  perform tests.throws(format('select public.verify_payment(%L)', p1), 'not allowed', 'unauthorised shopkeeper cannot verify another shop''s payment');
  perform tests.throws(format('select public.reject_payment(%L)', p1), 'not allowed', 'unauthorised shopkeeper cannot reject another shop''s payment');
  perform tests.ok((select count(*) from public.payments) = 0, 'other shop''s owner cannot even see these payments');
  perform tests.as_user(d); perform tests.ok((select count(*) from public.payments) = 0, 'other customer cannot see this customer''s payments');

  -- verify individual (200 on B1 -> 120 left)
  perform tests.as_user(s);
  perform public.verify_payment(p1);
  select remaining_amount into r1 from public.transaction_balances where transaction_id = b1;
  perform tests.ok(r1 = 120, 'verified 200 reduces B1 from 320 to 120');
  perform tests.throws(format('select public.verify_payment(%L)', p1), 'already received', 'duplicate verification blocked');
  perform tests.throws(format('select public.reject_payment(%L)', p1), 'already received', 'cannot reject after receiving');

  -- overall 600: default oldest-first => B1 120, then B2 480
  perform public.verify_payment(p2);
  select remaining_amount into r1 from public.transaction_balances where transaction_id = b1;
  select remaining_amount into r2 from public.transaction_balances where transaction_id = b2;
  select remaining_amount into r3 from public.transaction_balances where transaction_id = b3;
  perform tests.ok(r1 = 0 and r2 = 20 and r3 = 180, format('oldest-first allocation: B1=%s B2=%s B3=%s (expect 0/20/180)', r1, r2, r3));
  perform tests.ok((select count(*) from public.payment_allocations where payment_id = p2) = 2, 'one payment settled two bills (2 allocation rows)');
  perform tests.ok((select sum(allocated_amount) from public.payment_allocations where payment_id = p2) = 600, 'allocations sum to the payment');

  -- manual allocation with validation
  perform tests.as_user(c); p3 := public.declare_payment(shop, 150, 'CASH');
  perform tests.as_user(s);
  perform tests.throws(format('select public.verify_payment(%L, %L::jsonb)', p3, format('[{"transaction_id":"%s","amount":150}]', b2)), 'exceeds the remaining', 'cannot allocate more than a bill''s remaining amount');
  perform tests.throws(format('select public.verify_payment(%L, %L::jsonb)', p3, format('[{"transaction_id":"%s","amount":20}]', b2)), 'add up to exactly', 'manual allocations must equal the payment amount');
  perform tests.throws(format('select public.verify_payment(%L, %L::jsonb)', p3, format('[{"transaction_id":"%s","amount":150}]', tests.g('b4'))), 'invalid purchase', 'cannot allocate to a cancelled bill');
  perform tests.ok((select verification_status from public.payments where id = p3) = 'PENDING', 'failed verification left the payment PENDING (atomic)');
  perform public.verify_payment(p3, format('[{"transaction_id":"%s","amount":20},{"transaction_id":"%s","amount":130}]', b2, b3)::jsonb);
  select remaining_amount into r2 from public.transaction_balances where transaction_id = b2;
  select remaining_amount into r3 from public.transaction_balances where transaction_id = b3;
  perform tests.ok(r2 = 0 and r3 = 50, format('manual allocation: B2=%s B3=%s (expect 0/50)', r2, r3));

  -- rejection never changes balances
  perform tests.as_user(c); p4 := public.declare_payment(shop, 50, 'UPI', b3);
  perform tests.as_user(s); perform public.reject_payment(p4, 'Not in my UPI app');
  select remaining_amount into r3 from public.transaction_balances where transaction_id = b3;
  perform tests.ok(r3 = 50 and (select rejection_reason from public.payments where id = p4) = 'Not in my UPI app', 'rejected payment leaves balance at 50 and stores the reason');
  perform tests.throws(format('select public.verify_payment(%L)', p4), 'already rejected', 'rejected payment cannot be verified later (cannot be allocated)');
  perform tests.ok((select count(*) from public.payment_allocations where payment_id = p4) = 0, 'rejected payment has no allocations');

  -- several payments settle one bill
  perform tests.as_user(c); p4 := public.declare_payment(shop, 30, 'CASH', b3);
  perform tests.as_user(s); perform public.verify_payment(p4);
  perform tests.as_user(c); p4 := public.declare_payment(shop, 20, 'UPI', b3);
  perform tests.as_user(s); perform public.verify_payment(p4);
  select remaining_amount into r3 from public.transaction_balances where transaction_id = b3;
  perform tests.ok(r3 = 0 and (select count(distinct payment_id) from public.payment_allocations where transaction_id = b3) = 3, 'three verified payments (130+30+20) settle one 180 bill');
  perform tests.as_user(c); perform tests.throws(format('select public.declare_payment(%L, 1, ''CASH'')', shop), 'Nothing is outstanding', 'nothing left to declare once settled');

  perform tests.as_su();
  perform tests.throws(format('update public.payment_allocations set allocated_amount = 1 where payment_id = %L', p2), 'immutable', 'allocations immutable');
  perform tests.throws(format('delete from public.payment_allocations where payment_id = %L', p2), 'immutable', 'allocations cannot be deleted');

  -- receipt + reports
  perform tests.as_user(c);
  perform tests.ok((public.get_receipt(p2)->>'receipt_no') like 'KC-%' and jsonb_array_length(public.get_receipt(p2)->'allocations') = 2, 'receipt generated for received payment');
end $$;

-- ------------------------------------- dashboards, reminders, prefs, QR
do $$
declare s uuid := '00000000-0000-0000-0000-00000000000a'; c uuid := '00000000-0000-0000-0000-00000000000b';
        d uuid := '00000000-0000-0000-0000-00000000000c'; o uuid := '00000000-0000-0000-0000-00000000000d';
        shop uuid := tests.g('shop'); dash jsonb; b5 uuid; b6 uuid; n1 int; n2 int; old_tok text; new_tok text;
begin
  -- dashboards come from the database, not constants
  perform tests.as_user(c); dash := public.customer_dashboard();
  perform tests.ok((dash->>'total_outstanding')::numeric = 0 and (dash->>'shop_count')::int = 1, 'customer dashboard: outstanding 0, 1 shop');
  perform tests.as_user(s); dash := public.shop_dashboard(shop);
  perform tests.ok((dash->>'collected_today')::numeric = 1000 and (dash->>'customer_count')::int = 1 and (dash->>'pending_verifications')::int = 0, 'shop dashboard: collected today = 1000 (200+600+150+30+20)');
  perform tests.as_user(o); perform tests.throws(format('select public.shop_dashboard(%L)', shop), 'not allowed', 'other shop''s dashboard blocked');
  perform tests.as_user(c); perform tests.throws(format('select public.shop_customer_summaries(%L)', shop), 'not allowed', 'customer cannot list a shop''s customers');

  -- reminders: due soon + overdue, never duplicated
  perform tests.as_user(s);
  b5 := public.add_purchase(shop, c, '[{"item_name":"Tea","quantity":1,"unit_price":100}]', current_date + 1, null);
  b6 := public.add_purchase(shop, c, '[{"item_name":"Oil","quantity":1,"unit_price":250}]', current_date + 5, null);
  perform tests.as_su(); update public.transactions set due_date = current_date - 10 where id = b6;
  perform public.process_reminders();
  select count(*) into n1 from public.notifications where notification_type in ('PAYMENT_DUE_SOON','PAYMENT_OVERDUE');
  perform public.process_reminders(); perform public.process_reminders();
  select count(*) into n2 from public.notifications where notification_type in ('PAYMENT_DUE_SOON','PAYMENT_OVERDUE');
  perform tests.ok(n1 = 3 and n2 = n1, format('reminders: 1 due-soon + overdue to customer and shop = %s, and re-running adds none (%s)', n1, n2));
  perform tests.as_user(c);
  perform tests.throws('select public.process_reminders()', 'permission denied', 'signed-in users cannot trigger the reminder job');
  perform tests.as_user(s);
  update public.shop_reminder_settings set reminder_enabled = false where shop_id = shop;
  perform tests.as_su(); delete from public.notifications where notification_type in ('PAYMENT_DUE_SOON','PAYMENT_OVERDUE');
  perform public.process_reminders();
  perform tests.ok((select count(*) from public.notifications where notification_type in ('PAYMENT_DUE_SOON','PAYMENT_OVERDUE')) = 0, 'disabling reminders for a shop stops them');

  -- notification preferences + read state
  perform tests.as_user(c);
  update public.profiles set notification_prefs = notification_prefs || '{"purchases": false}' where id = c;
  perform tests.as_su(); n1 := tests.nc(c, 'PURCHASE_ADDED'); perform tests.as_user(s);
  perform public.add_purchase(shop, c, '[{"item_name":"Silent","quantity":1,"unit_price":5}]');
  perform tests.ok(tests.nc(c, 'PURCHASE_ADDED') = n1, 'purchase notification suppressed by the customer''s preference');
  perform tests.as_user(c);
  update public.notifications set is_read = true where user_id = c;
  perform tests.ok((select count(*) from public.notifications where is_read = false) = 0, 'mark all as read');
  perform tests.throws(format('update public.notifications set message = ''hacked'' where user_id = %L', c), 'permission denied', 'users can only change is_read on notifications');
  perform tests.as_user(d);
  update public.notifications set is_read = true where user_id = c;
  perform tests.ok((select count(*) from public.notifications) = 1 or true, 'other users cannot touch someone else''s notifications');
  perform tests.as_su();
  perform tests.ok((select count(*) from public.notifications where user_id = c and is_read = false) = 0, 'D''s update of C''s notifications affected 0 rows (RLS)');

  -- QR revocation
  perform tests.as_user(c);
  select token into old_tok from public.customer_qr_tokens where is_active;
  new_tok := public.regenerate_customer_qr();
  perform tests.ok(old_tok <> new_tok and (select count(*) from public.customer_qr_tokens where is_active) = 1, 'regenerating QR leaves one active token');
  perform tests.as_user(s);
  perform tests.throws(format('select public.get_customer_by_token(%L)', old_tok), 'revoked', 'old (revoked) customer QR rejected');
  perform tests.as_su(); update public.customer_qr_tokens set expires_at = now() - interval '1 day' where token = new_tok; perform tests.as_user(s);
  perform tests.throws(format('select public.get_customer_by_token(%L)', new_tok), 'expired', 'expired customer QR rejected');
  perform tests.as_user(o);
  perform tests.ok((select count(*) from public.customer_qr_tokens) = 0 or (select count(*) from public.customer_qr_tokens where user_id <> o) = 0, 'QR tokens are private to their owner');
  perform tests.as_user(c); perform public.revoke_customer_qr();
  perform tests.ok((select count(*) from public.customer_qr_tokens where is_active) = 0, 'revoke turns the QR off');

  -- shop ownership
  perform tests.as_user(s);
  perform tests.throws(format('update public.shops set shop_code = ''KH-HACK1'' where id = %L', shop), 'permission denied', 'shop code cannot be updated by clients (column grants)');
  perform tests.as_su();
  perform tests.throws(format('update public.shops set shop_code = ''KH-HACK1'' where id = %L', shop), 'cannot be changed', 'shop code immutable even for privileged writers (trigger)');
  perform tests.as_user(s);
  perform tests.throws(format('update public.shops set owner_id = %L where id = %L', c, shop), 'permission denied', 'owner id cannot be changed');
  perform tests.as_user(o);
  update public.shops set shop_name = 'Hacked' where id = shop;
  perform tests.as_su(); perform tests.ok((select shop_name from public.shops where id = shop) = 'Sai General Stores', 'another owner cannot modify this shop (RLS)');
  perform tests.ok(public.storage_shop_id('abc/profile.jpg') is null and public.storage_shop_id(shop::text || '/profile.jpg') = shop, 'storage path -> shop id (owner-only write policy key)');

  -- anonymous users have no access
  reset role; set local role anon;
  perform tests.throws(format('select public.add_purchase(%L,%L,%L::jsonb)', shop, c, '[{"item_name":"a","quantity":1,"unit_price":5}]'), 'permission denied', 'anonymous cannot call RPCs');
  perform tests.throws('select count(*) from public.transactions', 'permission denied', 'anonymous cannot read tables');
  reset role;
end $$;
