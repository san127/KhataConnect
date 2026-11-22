// import { Platform, PermissionsAndroid } from 'react-native';
// import {
//   getMessaging, getToken, onMessage, onTokenRefresh, registerDeviceForRemoteMessages, deleteToken,
// } from '@react-native-firebase/messaging';
// import notifee, { AndroidImportance } from '@notifee/react-native';
// import { supabase } from '../supabase/client';

// const CHANNEL_ID = 'khataconnect-default';

// async function ensureChannel() {
//   return notifee.createChannel({ id: CHANNEL_ID, name: 'KhataConnect', importance: AndroidImportance.HIGH });
// }

// /** Show a data-only FCM message with Notifee (used in foreground and background handlers). */
// export async function displayRemoteMessage(msg: { data?: { [k: string]: string | object } }) {
//   const d = msg.data ?? {};
//   if (!d.title) return;
//   const channelId = await ensureChannel();
//   await notifee.displayNotification({
//     title: String(d.title), body: String(d.body ?? ''), data: d as Record<string, string>,
//     android: { channelId, pressAction: { id: 'default' }, smallIcon: 'ic_launcher' },
//     ios: { sound: 'default' },
//   });
// }

// export async function requestNotificationPermission(): Promise<boolean> {
//   try {
//     const s = await notifee.requestPermission();
//     if (Platform.OS === 'android' && Platform.Version >= 33) {
//       const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
//       return r === PermissionsAndroid.RESULTS.GRANTED;
//     }
//     return s.authorizationStatus >= 1;
//   } catch {
//     return false;
//   }
// }

// async function saveToken(uid: string, token: string) {
//   await supabase.from('push_tokens').upsert(
//     { user_id: uid, fcm_token: token, device_type: Platform.OS === 'ios' ? 'ios' : 'android' },
//     { onConflict: 'fcm_token' });
// }

// /** Returns cleanup. Safe to call when Firebase is not configured yet (logs and returns). */
// export async function registerPush(uid: string): Promise<() => void> {
//   try {
//     const granted = await requestNotificationPermission();
//     if (!granted) return () => {};
//     const m = getMessaging();
//     await registerDeviceForRemoteMessages(m);
//     await ensureChannel();
//     const token = await getToken(m);
//     if (token) await saveToken(uid, token);
//     const offRefresh = onTokenRefresh(m, (t: string) => { saveToken(uid, t); });
//     const offMsg = onMessage(m, displayRemoteMessage);
//     return () => { offRefresh(); offMsg(); };
//   } catch (e) {
//     console.warn('[push] not available (is Firebase configured?)', e);
//     return () => {};
//   }
// }

// export async function unregisterPush() {
//   try {
//     const m = getMessaging();
//     const token = await getToken(m);
//     if (token) await supabase.from('push_tokens').delete().eq('fcm_token', token);
//     await deleteToken(m);
//   } catch {}
// }





import { Platform } from 'react-native';

import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  deleteToken,
} from '@react-native-firebase/messaging';

import notifee, {
  AndroidImportance,
} from '@notifee/react-native';

import { supabase } from '../supabase/client';

const CHANNEL_ID = 'khataconnect-default';

// Create Android notification channel
export async function ensureChannel() {
  return notifee.createChannel({
    id: CHANNEL_ID,
    name: 'KhataConnect',
    importance: AndroidImportance.HIGH,
  });
}

// Display incoming FCM notification
export async function displayRemoteMessage(msg: any) {


  console.log('[PUSH] Message received:', JSON.stringify(msg));

  const d = msg.data ?? {};
  console.log('[PUSH] Message data:', d);

  if (!d.title) return;




  const data = msg.data ?? {};

  const title = data.title ?? msg.notification?.title;
  const body = data.body ?? msg.notification?.body ?? '';

  

  if (!title) {
    console.log('[Push] Missing notification title', msg);
    return;
  }

  const channelId = await ensureChannel();

  await notifee.displayNotification({
    title: String(title),
    body: String(body),
    data,
    android: {
      channelId,
      smallIcon: 'ic_stat_notification',
      pressAction: {
        id: 'default',
      },
    },
  });
}

// Request Android notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();

    if (
      Platform.OS === 'android' &&
      Platform.Version >= 33
    ) {
      return settings.authorizationStatus >= 1;
    }

    return settings.authorizationStatus >= 1;
  } catch (error) {
    console.error('[Push] Permission error:', error);
    return false;
  }
}

// Save FCM token in Supabase
async function saveToken(uid: string, token: string) {
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: uid,
        fcm_token: token,
        device_type: Platform.OS === 'ios' ? 'ios' : 'android',
      },
      { onConflict: 'fcm_token' }
    );

  if (error) {
    console.error('[Push] Token save error:', error);
  } else {
    console.log('[Push] Token saved successfully');
  }
}

// Register device for push notifications
export async function registerPush(
  uid: string
): Promise<() => void> {
  try {
    const granted = await requestNotificationPermission();

    if (!granted) {
      console.log('[Push] Permission denied');
      return () => {};
    }

    const messaging = getMessaging();

    await registerDeviceForRemoteMessages(messaging);

    await ensureChannel();

    const token = await getToken(messaging);

    console.log('[Push] FCM Token:', token);

    if (token) {
      await saveToken(uid, token);
    }

    const offRefresh = onTokenRefresh(
      messaging,
      (newToken: string) => {
        void saveToken(uid, newToken);
      }
    );

    // const offMessage = onMessage(
    //   messaging,
    //   async remoteMessage => {
    //     console.log('[Push] Foreground message:', remoteMessage);
    //     await displayRemoteMessage(remoteMessage);
    //   }
    // );



    const offMessage = onMessage(messaging, async (remoteMessage) => {
  console.log('[FCM] FOREGROUND MESSAGE RECEIVED:', JSON.stringify(remoteMessage));

  try {
    await displayRemoteMessage(remoteMessage);
    console.log('[FCM] Notifee display function completed');
  } catch (error) {
    console.error('[FCM] Notifee display failed:', error);
  }
});
    return () => {
      offRefresh();
      offMessage();
    };

  } catch (error) {
    console.error('[Push] Registration failed:', error);
    return () => {};
  }
}

// Unregister device
export async function unregisterPush() {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging);

    if (token) {
      await supabase
        .from('push_tokens')
        .delete()
        .eq('fcm_token', token);
    }

    await deleteToken(messaging);

  } catch (error) {
    console.error('[Push] Unregister error:', error);
  }
}

// Background message handler
export async function handleBackgroundMessage(
  remoteMessage: any
) {
  console.log('[Push] Background message:', remoteMessage);
  await displayRemoteMessage(remoteMessage);
}





export async function testLocalNotification() {
  try {
    const channelId = await ensureChannel();

    await notifee.displayNotification({
      title: 'KhataConnect Test',
      body: 'If you can see this, Notifee is working!',
      android: {
        channelId,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_launcher',
      },
    });

    console.log('[PUSH] Local notification displayed');
  } catch (error) {
    console.error('[PUSH] Local notification failed:', error);
  }
}