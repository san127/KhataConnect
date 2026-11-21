-- Server-side reminders: runs daily at 09:00 IST (03:30 UTC) even when no app is open.
-- Requires the pg_cron extension (Database -> Extensions in the Supabase dashboard).
create extension if not exists pg_cron;

select cron.schedule('khataconnect-reminders', '30 3 * * *', $$ select public.process_reminders(); $$);
