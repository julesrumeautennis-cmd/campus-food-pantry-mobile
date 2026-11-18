import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';
import { project } from './project';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || project.supabaseUrl;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || (url === project.supabaseUrl ? project.publishableKey : undefined);
export const authConfigured = Boolean(url && key);
// No privileged key is used by the app. Configuration errors have a dedicated screen.
export const supabase = authConfigured ? createClient(url!, key!, {
  auth: {
    ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
    autoRefreshToken: true, persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', lock: processLock,
  },
}) : null;
export const authRedirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || undefined;
