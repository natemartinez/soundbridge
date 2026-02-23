import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// AsyncStorage uses `window` internally, which doesn't exist during SSR.
// Lazy-import it only on native or when window is available (client-side web).
let storage: any = undefined;
if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  storage = require('@react-native-async-storage/async-storage').default;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    ...(storage ? { storage } : {}),
    autoRefreshToken: true,
    persistSession: !!storage,
    detectSessionInUrl: false,
  },
});
