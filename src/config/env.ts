import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, APP_DEEP_LINK } from '@env';

export const env = {
  supabaseUrl: SUPABASE_URL ?? '',
  supabaseKey: SUPABASE_PUBLISHABLE_KEY ?? '',
  deepLink: APP_DEEP_LINK || 'khataconnect://auth-callback',
};

export const isConfigured =
  env.supabaseUrl.startsWith('https://') && !env.supabaseUrl.includes('YOUR-PROJECT') && env.supabaseKey.length > 10;
