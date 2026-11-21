# KhataConnect

A digital *udhaar* (credit ledger) app that connects local shopkeepers and their regular customers.
React Native CLI (no Expo) · TypeScript · Supabase (Postgres, Auth, Realtime, Storage, Edge Functions).

One account can act as **Customer** and **Shopkeeper**. Shopkeepers record itemised credit purchases;
customers declare UPI/Cash payments; shopkeepers verify them. **Balances are always derived on the server
and only shopkeeper-verified (`RECEIVED`) payments reduce them.**

## What is in the box

| Area | Notes |
|---|---|
| Auth | Email or phone + password, email verification, password reset by email link or SMS OTP, session in AsyncStorage (never the password) |
| Connections | Shop code (`KH-ABC123`), shop QR, customer QR; both sides can initiate, the other side approves |
| Purchases | Itemised, server-computed totals, due dates, customer acknowledge / dispute, void-with-reason (rows are never edited) |
| Payments | Customer declares `UPI` or `CASH` → shopkeeper marks received/rejected → oldest-first allocation, receipts |
| Notifications | In-app (Realtime), FCM push via Edge Function + Notifee, daily due-soon/overdue reminders via `pg_cron` |
| Theme | Pastel green / white / brown, light + dark + system |
| Security | RLS on every table, column-level grants, `SECURITY DEFINER` RPCs with fixed `search_path`, immutable financial rows, private UPI QR bucket with signed URLs |

Intentionally **not** included: GPS, UTR / payment screenshots, in-app money movement (cards, wallets, banks).

## Setup

1. `npm install` (and `cd ios && bundle exec pod install` on macOS)
2. Create a Supabase project, then copy `.env.example` → `.env` and fill in `SUPABASE_URL` and the **publishable (anon)** key `SUPABASE_PUBLISHABLE_KEY`.
   Never put the service-role key in the app.
3. Apply `supabase/migrations/0001…0004` in order (`supabase db push`, or paste into the SQL editor).
   `0004_schedule.sql` needs the `pg_cron` extension enabled.
4. Auth → URL configuration: add the deep-link redirect (`khataconnect://auth-callback`). Enable the Phone provider + an SMS
   provider if you want phone sign-in / SMS recovery.
5. Push (optional): add `android/app/google-services.json` and `ios/KhataConnect/GoogleService-Info.plist` (git-ignored), then
   ```sh
   supabase secrets set FCM_PROJECT_ID=… FCM_CLIENT_EMAIL=… FCM_PRIVATE_KEY="…"
   supabase functions deploy send-push send-reminders
   ```
   and create a Database Webhook on `INSERT` into `public.notifications` that calls `send-push`.
6. `npm start`, then `npm run android` / `npm run ios`.

## Tests

```sh
npm test            # Jest: money, allocation and validation rules
npx tsc --noEmit    # type-check

# Database integration tests (needs a local Postgres 14+ superuser connection)
PGHOST=localhost PGPORT=5432 PGUSER=postgres supabase/tests/run_local.sh
```

The SQL suite loads Supabase-compatible stubs (`auth.users`, roles), applies migrations 0001–0003 and then asserts
RLS isolation between shops/customers, itemised totals, connection rules, dispute and void flow, payment declare / verify /
reject, multi-payment settlement, oldest-first allocation, immutability, receipts, dashboards, reminder de-duplication,
notification preferences, QR revocation/expiry and anonymous lockout.

## Layout

```
src/
  components/  screens/  navigation/  theme/   UI
  services/    store/    hooks/      utils/    data access, state, money + validation rules
supabase/
  migrations/  schema, RLS, RPCs, storage, schedule
  functions/   send-push, send-reminders
  tests/       database integration tests
```

## Verification status

Verified: TypeScript compiles, Jest passes, Metro bundles, and the SQL migrations + RLS pass the integration suite on local
Postgres 16. **Not verified here:** native Android/iOS builds on a device, push delivery, SMS delivery, and a hosted Supabase
project; expect to do first-run native setup (signing, Firebase files, deep-link schemes) yourself.
