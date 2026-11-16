import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { supabase, authRedirect } from './supabase';
import { Button, Field, Heading, Notice, s } from './ui';

export function AuthScreen({ recovery = false, onRecovered }: { recovery?: boolean; onRecovered: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit() {
    if (!supabase || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (recovery) {
        if (password.length < 8) throw new Error('Use at least 8 characters.');
        const { error } = await supabase.auth.updateUser({ password }); if (error) throw error;
        setPassword(''); onRecovered();
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw error;
      } else if (mode === 'signup') {
        if (!name.trim()) throw new Error('Enter your name.');
        if (password.length < 8) throw new Error('Use at least 8 characters.');
        const { error, data } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() }, emailRedirectTo: authRedirect } });
        if (error) throw error;
        if (!data.session) { setMessage('Check your email to confirm your account, then come back here to sign in.'); setMode('login'); setPassword(''); }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect }); if (error) throw error;
        setMessage('If an account exists for this email, you will receive a reset link. Open it on this device.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to complete this request.'); }
    finally { setBusy(false); }
  }
  const title = recovery ? 'Choose a new password.' : mode === 'signup' ? 'A place for everyone.' : mode === 'reset' ? 'Let’s get you back in.' : 'Your pantry.\nYour community.';
  return <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingTop: 45, gap: 28 }]}>
    <Text style={s.brand}>campus pantry<Text style={{ fontSize: 24 }}> ·</Text></Text>
    <Heading eyebrow="CAMPUS FOOD PANTRY" title={title} description={mode === 'reset' ? 'Enter your email and we’ll send you a password reset link.' : 'Everyday essentials, a little more within reach.'} />
    {message ? <Notice text={message} /> : null}{error ? <Notice text={error} error /> : null}
    <View style={[s.card, { gap: 18 }]}>
      {!recovery && mode === 'signup' ? <Field label="Your name" value={name} onChangeText={setName} autoComplete="name" maxLength={80} /> : null}
      {!recovery ? <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="you@example.com" /> : null}
      {recovery || mode !== 'reset' ? <Field label={recovery ? 'New password' : 'Password'} value={password} onChangeText={setPassword} secureTextEntry autoComplete={recovery || mode === 'signup' ? 'new-password' : 'current-password'} autoCapitalize="none" onSubmitEditing={submit} /> : null}
      <Button title={recovery ? 'Save password' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'} onPress={submit} busy={busy} disabled={!recovery && !email.trim()} />
      {!recovery && mode === 'login' ? <Button title="Forgot your password?" secondary onPress={() => { setMode('reset'); setError(''); setMessage(''); }} /> : null}
    </View>
    {!recovery ? <View style={{ gap: 12 }}><Text style={[s.body, { textAlign: 'center' }]}>{mode === 'login' ? 'New to the pantry? Everyone is welcome.' : 'Already have an account?'}</Text><Button title={mode === 'login' ? 'Create an account' : 'Back to sign in'} secondary onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }} /></View> : null}
    <Text style={[s.small, { textAlign: 'center' }]}>Food and hygiene essentials. Up to five approved units each week.</Text>
  </ScrollView></KeyboardAvoidingView>;
}
