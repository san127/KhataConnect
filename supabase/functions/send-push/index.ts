// // Edge Function: send-push
// // Trigger: Database Webhook on INSERT into public.notifications (Dashboard -> Database -> Webhooks).
// // Secrets required (supabase secrets set ...):
// //   FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY   (Firebase service account)
// // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically (server-side only).
// import { createClient } from 'npm:@supabase/supabase-js@2';

// const b64url = (b: ArrayBuffer | string) =>
//   btoa(typeof b === 'string' ? b : String.fromCharCode(...new Uint8Array(b)))
//     .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

// async function accessToken(): Promise<string> {
//   const email = Deno.env.get('FCM_CLIENT_EMAIL')!;
//   const pem = Deno.env.get('FCM_PRIVATE_KEY')!.replace(/\\n/g, '\n');
//   const now = Math.floor(Date.now() / 1000);
//   const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
//   const claim = b64url(JSON.stringify({
//     iss: email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
//     aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
//   }));
//   const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, '')), c => c.charCodeAt(0));
//   const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
//   const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`));
//   const jwt = `${header}.${claim}.${b64url(sig)}`;
//   const res = await fetch('https://oauth2.googleapis.com/token', {
//     method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//     body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
//   });
//   return (await res.json()).access_token;
// }

// Deno.serve(async req => {
//   const { record } = await req.json();
//   if (!record?.user_id) return new Response('no record', { status: 400 });
//   const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
//   const { data: tokens } = await admin.from('push_tokens').select('fcm_token').eq('user_id', record.user_id);
//   if (!tokens?.length) return new Response('no tokens');
//   const at = await accessToken();
//   const project = Deno.env.get('FCM_PROJECT_ID')!;
//   for (const { fcm_token } of tokens) {
//     const res = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
//       method: 'POST',
//       headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
//       body: JSON.stringify({ message: {
//         token: fcm_token,
//         data: { title: record.title, body: record.message, type: record.notification_type, related_id: record.related_id ?? '' },
//         android: { priority: 'HIGH' },
//         apns: { headers: { 'apns-priority': '10' }, payload: { aps: { 'content-available': 1 } } },
//       } }),
//     });
//     if (res.status === 404 || res.status === 400) await admin.from('push_tokens').delete().eq('fcm_token', fcm_token);
//   }
//   await admin.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', record.id);
//   return new Response('ok');
// });





import { createClient } from 'npm:@supabase/supabase-js@2';

function base64Url(input: Uint8Array | string): string {
  const bytes =
    typeof input === 'string'
      ? new TextEncoder().encode(input)
      : input;

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getFirebaseAccessToken(): Promise<string> {
  const email = Deno.env.get('FCM_CLIENT_EMAIL');
  const privateKey = Deno.env.get('FCM_PRIVATE_KEY');

  if (!email || !privateKey) {
    throw new Error('Firebase service account secrets are missing');
  }

  const pem = privateKey.replace(/\\n/g, '\n');

  const der = Uint8Array.from(
    atob(pem.replace(/-----[^-]+-----|\s/g, '')),
    (char) => char.charCodeAt(0),
  );

  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );

  const now = Math.floor(Date.now() / 1000);

  const header = base64Url(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  );

  const claim = base64Url(
    JSON.stringify({
      iss: email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );

  const unsignedToken = `${header}.${claim}`;

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken),
  );

  const jwt = `${unsignedToken}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.access_token) {
    console.error('[push] Firebase OAuth failed:', result);
    throw new Error('Could not obtain Firebase access token');
  }

  return result.access_token;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Authenticate the Database Webhook using a shared secret.
  const expectedSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  const suppliedSecret = req.headers.get('x-webhook-secret');

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload = await req.json();
    const record = payload.record;

    if (
      !record?.id ||
      !record?.user_id ||
      !record?.title ||
      !record?.message
    ) {
      return new Response('Invalid notification record', { status: 400 });
    }

    const projectId = Deno.env.get('FCM_PROJECT_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!projectId || !supabaseUrl || !serviceRoleKey) {
      throw new Error('Required server configuration is missing');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokens, error: tokenError } = await admin
      .from('push_tokens')
      .select('fcm_token')
      .eq('user_id', record.user_id);

    if (tokenError) {
      throw tokenError;
    }

    if (!tokens?.length) {
      return new Response('No registered devices', { status: 200 });
    }

    const accessToken = await getFirebaseAccessToken();

    let sent = 0;
    let failed = 0;

    for (const { fcm_token } of tokens) {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: fcm_token,
              data: {
                title: String(record.title),
                body: String(record.message),
                type: String(record.notification_type ?? ''),
                related_id: String(record.related_id ?? ''),
              },
              android: {
                priority: 'HIGH',
              },
              apns: {
                headers: {
                  'apns-priority': '10',
                },
                payload: {
                  aps: {
                    'content-available': 1,
                  },
                },
              },
            },
          }),
        },
      );

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        sent++;
        continue;
      }

      failed++;
      console.error('[push] FCM send failed:', result);

      // Delete only tokens that Firebase explicitly identifies as unregistered.
      const errorDetails = result?.error?.details ?? [];
      const isUnregistered = errorDetails.some(
        (detail: { errorCode?: string }) =>
          detail.errorCode === 'UNREGISTERED',
      );

      if (isUnregistered) {
        await admin
          .from('push_tokens')
          .delete()
          .eq('fcm_token', fcm_token);
      }
    }

    if (failed === 0) {
      await admin
        .from('notifications')
        .update({ pushed_at: new Date().toISOString() })
        .eq('id', record.id);
    }

    return Response.json({
      success: failed === 0,
      sent,
      failed,
    }, {
      status: failed === 0 ? 200 : 502,
    });
  } catch (error) {
    console.error('[send-push] Error:', error);

    return Response.json(
      { error: 'Push notification processing failed' },
      { status: 500 },
    );
  }
});
