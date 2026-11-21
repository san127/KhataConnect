import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../../config/env';

// Only the publishable (anon) key lives in the app. The service-role key must never be bundled.
export const supabase = createClient(env.supabaseUrl || 'https://placeholder.supabase.co', env.supabaseKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
