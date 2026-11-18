import React, { useEffect, useState } from 'react';
import { AppState, Linking, Platform, StatusBar, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase, authConfigured } from './src/supabase';
import { useFonts } from 'expo-font';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { pantryFonts } from './src/assets';
import { MotionPreference } from './src/motion';
import { AuthScreen } from './src/AuthScreen';
import { PantryApp } from './src/PantryApp';
import { PantryLoading } from './src/CartMotion';
import { Heading, Notice, s } from './src/ui';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ ...pantryFonts, ...MaterialIcons.font });
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (active) { setSession(next); setLoading(false); if (event === 'PASSWORD_RECOVERY') setRecovery(true); if (event === 'SIGNED_OUT') setRecovery(false); }
    });
    supabase.auth.getSession().then(({ data, error }) => { if (active) { setSession(data.session); if (error) setError(error.message); setLoading(false); } }).catch(e => { if (active) { setError(String(e)); setLoading(false); } });
    const appState = AppState.addEventListener('change', state => {
      if (Platform.OS !== 'web') { if (state === 'active') supabase!.auth.startAutoRefresh(); else supabase!.auth.stopAutoRefresh(); }
    });
    if (Platform.OS !== 'web' && AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    async function receive(url: string | null | undefined) {
      if (!url || Platform.OS === 'web') return;
      try {
        const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
        const access_token = params.get('access_token'), refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error } = await supabase!.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          if (active && params.get('type') === 'recovery') setRecovery(true);
        }
      } catch { if (active) setError('This sign-in link could not be opened. Request a new link.'); }
    }
    Linking.getInitialURL().then(receive).catch(() => {});
    const links = Linking.addEventListener('url', event => { void receive(event.url); });
    return () => { active = false; subscription.unsubscribe(); appState.remove(); links.remove(); supabase!.auth.stopAutoRefresh(); };
  }, []);
  return <SafeAreaProvider><MotionPreference><SafeAreaView style={s.screen}><StatusBar barStyle="dark-content" />
    {!authConfigured ? <View style={[s.content, s.container]}><Heading title="Campus Food Pantry" description="The app needs its Supabase connection before sign-in is available." /><Notice text="Copy mobile/.env.example to .env, add the public Supabase key and API URL, then restart Expo." /></View> : (loading || (!fontsLoaded && !fontError)) ? <PantryLoading /> : <>
      {error ? <Notice text={error} error /> : null}
      {!session || recovery ? <AuthScreen recovery={recovery} onRecovered={() => setRecovery(false)} /> : <PantryApp key={session.user.id} />}
    </>}
  </SafeAreaView></MotionPreference></SafeAreaProvider>;
}
