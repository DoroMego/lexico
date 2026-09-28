import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY;


// Web storage that guards against `window` being undefined during Expo static export (SSR in Node.js).
const webStorage = {
  getItem: (key: string): Promise<string | null> =>
    Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(key) : null),
  setItem: (key: string, value: string): Promise<void> =>
    Promise.resolve(void (typeof window !== 'undefined' && window.localStorage.setItem(key, value))),
  removeItem: (key: string): Promise<void> =>
    Promise.resolve(void (typeof window !== 'undefined' && window.localStorage.removeItem(key))),
};

export const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: 'lexico-public-sample90.auth',
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
}) : null;
export const cloudEnabled = supabase !== null;
