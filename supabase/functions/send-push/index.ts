// Edge Function: send-push
// Trigger: Database Webhook on INSERT into public.notifications (Dashboard -> Database -> Webhooks).
// Secrets required (supabase secrets set ...):
//   FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY   (Firebase service account)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically (server-side only).
import { createClient } from 'npm:@supabase/supabase-js@2';

const b64url = (b: ArrayBuffer | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...new Uint8Array(b)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function accessToken(): Promise<string> {
  const email = Deno.env.get('FCM_CLIENT_EMAIL')!;
  const pem = Deno.env.get('FCM_PRIVATE_KEY')!.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`));
  const jwt = `${header}.${claim}.${b64url(sig)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  return (await res.json()).access_token;
}

Deno.serve(async req => {
  const { record } = await req.json();
  if (!record?.user_id) return new Response('no record', { status: 400 });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: tokens } = await admin.from('push_tokens').select('fcm_token').eq('user_id', record.user_id);
  if (!tokens?.length) return new Response('no tokens');
  const at = await accessToken();
  const project = Deno.env.get('FCM_PROJECT_ID')!;
  for (const { fcm_token } of tokens) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: {
        token: fcm_token,
        data: { title: record.title, body: record.message, type: record.notification_type, related_id: record.related_id ?? '' },
        android: { priority: 'HIGH' },
        apns: { headers: { 'apns-priority': '10' }, payload: { aps: { 'content-available': 1 } } },
      } }),
    });
    if (res.status === 404 || res.status === 400) await admin.from('push_tokens').delete().eq('fcm_token', fcm_token);
  }
  await admin.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', record.id);
  return new Response('ok');
});
