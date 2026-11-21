import { Platform, PermissionsAndroid } from 'react-native';
import {
  getMessaging, getToken, onMessage, onTokenRefresh, registerDeviceForRemoteMessages, deleteToken,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { supabase } from '../supabase/client';

const CHANNEL_ID = 'khataconnect-default';

async function ensureChannel() {
  return notifee.createChannel({ id: CHANNEL_ID, name: 'KhataConnect', importance: AndroidImportance.HIGH });
}

/** Show a data-only FCM message with Notifee (used in foreground and background handlers). */
export async function displayRemoteMessage(msg: { data?: { [k: string]: string | object } }) {
  const d = msg.data ?? {};
  if (!d.title) return;
  const channelId = await ensureChannel();
  await notifee.displayNotification({
    title: String(d.title), body: String(d.body ?? ''), data: d as Record<string, string>,
    android: { channelId, pressAction: { id: 'default' }, smallIcon: 'ic_launcher' },
    ios: { sound: 'default' },
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const s = await notifee.requestPermission();
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      return r === PermissionsAndroid.RESULTS.GRANTED;
    }
    return s.authorizationStatus >= 1;
  } catch {
    return false;
  }
}

async function saveToken(uid: string, token: string) {
  await supabase.from('push_tokens').upsert(
    { user_id: uid, fcm_token: token, device_type: Platform.OS === 'ios' ? 'ios' : 'android' },
    { onConflict: 'fcm_token' });
}

/** Returns cleanup. Safe to call when Firebase is not configured yet (logs and returns). */
export async function registerPush(uid: string): Promise<() => void> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return () => {};
    const m = getMessaging();
    await registerDeviceForRemoteMessages(m);
    await ensureChannel();
    const token = await getToken(m);
    if (token) await saveToken(uid, token);
    const offRefresh = onTokenRefresh(m, (t: string) => { saveToken(uid, t); });
    const offMsg = onMessage(m, displayRemoteMessage);
    return () => { offRefresh(); offMsg(); };
  } catch (e) {
    console.warn('[push] not available (is Firebase configured?)', e);
    return () => {};
  }
}

export async function unregisterPush() {
  try {
    const m = getMessaging();
    const token = await getToken(m);
    if (token) await supabase.from('push_tokens').delete().eq('fcm_token', token);
    await deleteToken(m);
  } catch {}
}
