import { Linking } from 'react-native';
import { handleAuthDeepLink } from '../services/auth/authService';
import { useAppStore } from '../store/appStore';

/** Called for the cold-start URL and for URLs received while running (email verify / password reset). */
export function setupAuthDeepLinks(onError: (msg: string) => void) {
  const handle = async (url?: string | null) => {
    if (!url) return;
    try {
      const kind = await handleAuthDeepLink(url);
      if (kind === 'recovery') useAppStore.getState().setRecoveryMode(true);
    } catch (e) {
      onError((e as Error).message);
    }
  };
  Linking.getInitialURL().then(handle).catch(() => {});
  const sub = Linking.addEventListener('url', ({ url }) => handle(url));
  return () => sub.remove();
}
