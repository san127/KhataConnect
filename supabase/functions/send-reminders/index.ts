// Optional HTTP trigger for reminder processing (the pg_cron job in 0004_schedule.sql already does this daily).
// Call with the service role key from a scheduler if you prefer Edge Functions over pg_cron.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async req => {
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) return new Response('forbidden', { status: 403 });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.rpc('process_reminders');
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ created: data });
});
