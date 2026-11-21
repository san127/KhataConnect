import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import notifee, { EventType } from '@notifee/react-native';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../theme/useTheme';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { ShopkeeperNavigator } from './ShopkeeperNavigator';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { OnboardingScreen } from '../screens/common/OnboardingScreen';
import { Screen } from '../components/common/Screen';
import { LoadingIndicator } from '../components/common/States';
import { AppText } from '../components/common/AppText';
import { setupAuthDeepLinks } from './linking';
import { registerPush } from '../services/notification/pushService';
import { routeForNotification } from '../screens/common/NotificationsScreen';
import { isConfigured } from '../config/env';

export const navRef = createNavigationContainerRef<any>();

function openFromPush(data: Record<string, unknown> | undefined) {
  if (!data?.type || !navRef.isReady()) return;
  const mode = useAppStore.getState().mode;
  const r = routeForNotification({ id: '', title: '', message: '', notification_type: String(data.type), related_id: (data.related_id as string) || null, is_read: false, created_at: '' }, mode);
  if (r) navRef.navigate(r.name, r.params);
}

export function RootNavigator() {
  const { theme } = useTheme();
  const { ready, session, mode, recoveryMode, onboarded } = useAppStore();
  const uid = session?.user.id;
  const cleanup = useRef<() => void>(() => {});

  useEffect(() => useAppStore.getState().init(), []);
  useEffect(() => setupAuthDeepLinks(msg => Alert.alert('Link problem', msg)), []);
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    registerPush(uid).then(off => { if (alive) cleanup.current = off; else off(); });
    return () => { alive = false; cleanup.current(); };
  }, [uid]);
  useEffect(() => {
    notifee.getInitialNotification().then(n => openFromPush(n?.notification.data)).catch(() => {});
    return notifee.onForegroundEvent(({ type, detail }) => { if (type === EventType.PRESS) openFromPush(detail.notification?.data); });
  }, []);

  const navTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: { ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme).colors, background: theme.colors.background, card: theme.colors.card, text: theme.colors.text, border: theme.colors.border, primary: theme.colors.primary },
  };

  let content: React.ReactNode;
  if (!ready) content = <Screen><LoadingIndicator label="Opening KhataConnect…" /></Screen>;
  else if (!isConfigured && !session) content = <AuthNavigator />;
  else if (!onboarded && !session) content = <OnboardingScreen />;
  else if (!session) content = <AuthNavigator />;
  else if (recoveryMode) content = <ResetPasswordScreen />;
  else content = mode === 'SHOPKEEPER' ? <ShopkeeperNavigator /> : <CustomerNavigator />;

  return <NavigationContainer ref={navRef} theme={navTheme}>{content}</NavigationContainer>;
}
