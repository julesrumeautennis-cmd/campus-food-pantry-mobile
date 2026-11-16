import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase, authConfigured } from './src/supabase';
import { api } from './src/api';
import { AuthScreen } from './src/AuthScreen';
import { AdminScreen } from './src/AdminScreen';
import { Badge, Button, colors, Empty, Field, Heading, Notice, ProductTile, Quota, s, Stepper } from './src/ui';
import type { Cart, Item, Me, PantryRequest } from './src/types';

export default function App() {
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
    async function receive(url: string | null) {
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
  return <SafeAreaView style={s.screen}><StatusBar barStyle="dark-content" backgroundColor={colors.background} />
    {!authConfigured ? <View style={[s.content, s.container]}><Heading title="Campus Food Pantry" description="The app needs its Supabase connection before sign-in is available." /><Notice text="Copy mobile/.env.example to .env, add the public Supabase key and API URL, then restart Expo." /></View> : loading ? <View style={[s.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={colors.green} /></View> : <>
      {error ? <Notice text={error} error /> : null}
      {!session || recovery ? <AuthScreen recovery={recovery} onRecovered={() => setRecovery(false)} /> : <PantryApp key={session.user.id} />}
    </>}
  </SafeAreaView>;
}

type Tab = 'browse' | 'basket' | 'requests' | 'account' | 'admin';
function PantryApp() {
  const [me, setMe] = useState<Me | null>(null); const [items, setItems] = useState<Item[]>([]); const [requests, setRequests] = useState<PantryRequest[]>([]);
  const [cart, setCart] = useState<Cart>({}); const [tab, setTab] = useState<Tab>('browse'); const [detail, setDetail] = useState<Item | null>(null);
  const [search, setSearch] = useState(''); const [category, setCategory] = useState(''); const [sort, setSort] = useState<'name' | 'id'>('name');
  const [filtered, setFiltered] = useState<Item[]>([]); const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const [review, setReview] = useState(false); const [result, setResult] = useState<PantryRequest | null>(null); const [newName, setNewName] = useState('');
  const submission = useRef<{ fingerprint: string; key: string } | null>(null); const submitting = useRef(false);
  const units = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const itemsById = new Map(items.map(item => [item.itemId, item]));
  async function refresh(signal?: AbortSignal) {
    setRefreshing(true); setError('');
    try {
      const [profile, inventory, history] = await Promise.all([api<Me>('/me', 'GET', undefined, signal), api<Item[]>('/items?sort=name', 'GET', undefined, signal), api<PantryRequest[]>('/requests/mine', 'GET', undefined, signal)]);
      if (signal?.aborted) return;
      setMe(profile); setItems(inventory); setRequests(history); setNewName(profile.displayName);
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Could not connect to the pantry.'); }
    finally { if (!signal?.aborted) setRefreshing(false); }
  }
  useEffect(() => { const control = new AbortController(); void refresh(control.signal); return () => control.abort(); }, []);
  useEffect(() => {
    if (!me) return;
    const control = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      api<Item[]>(`/items?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&sort=${sort}`, 'GET', undefined, control.signal)
        .then(value => { if (!control.signal.aborted) setFiltered(value); })
        .catch(e => { if (!control.signal.aborted) setError(e instanceof Error ? e.message : 'Search failed.'); })
        .finally(() => { if (!control.signal.aborted) setSearching(false); });
    }, 180);
    return () => { clearTimeout(timer); control.abort(); };
  }, [search, category, sort, items, Boolean(me)]);
  function navigate(next: Tab) { setTab(next); setDetail(null); setReview(false); setResult(null); setError(''); }
  function maxFor(item: Item) { return item.availability === 'EXPIRED' ? 0 : Math.max(0, Math.min(item.quantity, (me?.remainingUnits || 0) - units + (cart[item.itemId] || 0))); }
  function change(item: Item, value: number) {
    if (submitting.current) return;
    setCart(previous => {
      const total = Object.values(previous).reduce((a, b) => a + b, 0);
      const max = item.availability === 'EXPIRED' ? 0 : Math.max(0, Math.min(item.quantity, (me?.remainingUnits || 0) - total + (previous[item.itemId] || 0)));
      const next = { ...previous }; if (value <= 0) delete next[item.itemId]; else next[item.itemId] = Math.min(value, max);
      return next;
    });
  }
  async function signOut() { const { error } = await supabase!.auth.signOut(); if (error) setError(error.message); }
  async function submit() {
    if (submitting.current || units === 0) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const lines = Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ itemId: Number(id), quantity })).sort((a, b) => a.itemId - b.itemId);
      const fingerprint = JSON.stringify(lines);
      if (!submission.current || submission.current.fingerprint !== fingerprint) {
        // UUID collision resistance is enough here: it is a deduplication key, never an auth secret.
        const key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => { const r = Math.floor(Math.random() * 16); return (char === 'x' ? r : (r & 3) | 8).toString(16); });
        submission.current = { fingerprint, key };
      }
      const saved = await api<PantryRequest>('/requests', 'POST', { lines, idempotencyKey: submission.current.key });
      setResult(saved); setCart({}); setReview(false); submission.current = null;
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not submit. Try again with this same basket.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function saveName() { setBusy(true); setError(''); try { setMe(await api<Me>('/me', 'PATCH', { displayName: newName.trim() })); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your name.'); } finally { setBusy(false); } }
  const basketValid = me !== null && units > 0 && units <= me.remainingUnits && Object.entries(cart).every(([id, qty]) => { const item = itemsById.get(Number(id)); return Boolean(item && item.availability !== 'EXPIRED' && item.quantity >= qty); });

  return <View style={s.container}>
    <View style={s.header}><View><Text style={s.brand}>campus pantry ·</Text><Text style={s.brandSmall}>EVERYDAY ESSENTIALS</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open your account" onPress={() => navigate('account')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mint, justifyContent: 'center', alignItems: 'center' }}><Text style={[s.subtitle, { color: colors.green }]}>{me?.displayName.charAt(0).toUpperCase() || 'P'}</Text></Pressable></View>
    {!me ? <View style={s.content}><Heading title="Welcome to your pantry." />{error ? <Notice text={error} error /> : <ActivityIndicator color={colors.green} />}<Button title="Try again" onPress={() => void refresh()} busy={refreshing} /><Button title="Sign out" secondary onPress={() => void signOut()} /></View> : <>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.green} />}>
      {error ? <Notice text={error} error /> : null}
      {tab === 'browse' && !detail ? <>
        <Heading eyebrow="HERE FOR YOUR EVERYDAY" title={'A little support.\nA lot of possibility.'} description="Browse food and care essentials for your week." />
        <Quota me={me} selected={units} />
        <Field label="Find an essential" placeholder="Search rice, soap, toothpaste…" value={search} onChangeText={setSearch} autoCorrect={false} />
        <View style={{ flexDirection: 'row', gap: 8 }}>{[['', 'All items'], ['Food', 'Food'], ['Hygiene', 'Hygiene']].map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: category === value }} onPress={() => setCategory(value!)} style={[s.chip, category === value && s.chipActive]}><Text style={[s.chipText, category === value && { color: 'white' }]}>{label}</Text></Pressable>)}</View>
        <View style={s.rowBetween}><Text style={s.subtitle}>On the shelves</Text><Pressable accessibilityRole="button" onPress={() => setSort(sort === 'name' ? 'id' : 'name')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={s.small}>Sort: {sort === 'name' ? 'A–Z' : 'Lot ID'} ↕</Text></Pressable></View>
        {searching ? <ActivityIndicator color={colors.green} /> : filtered.length === 0 ? <Empty title="Nothing here just yet." detail={search ? 'Try another search or category.' : 'The pantry team will add available essentials here.'} /> : filtered.map(item => <View key={item.itemId} style={[s.card, { padding: 14, gap: 14 }]}><Pressable accessibilityRole="button" accessibilityLabel={`View ${item.name}`} onPress={() => setDetail(item)} style={{ flexDirection: 'row', gap: 16 }}><ProductTile item={item} /><View style={{ flex: 1, gap: 6 }}><Text style={s.eyebrow}>{item.category} · LOT {item.itemId}</Text><Text style={s.subtitle}>{item.name}</Text><Badge text={item.availability} /><Text style={s.small}>{item.quantity} units on shelf</Text></View></Pressable><View style={s.rowBetween}><Text style={s.small}>No cost · 1 unit each</Text><Stepper name={item.name} value={cart[item.itemId] || 0} max={maxFor(item)} onChange={qty => change(item, qty)} /></View></View>)}
      </> : null}
      {tab === 'browse' && detail ? <><Button title="← Back to the shelves" secondary onPress={() => setDetail(null)} /><ProductTile item={detail} large /><Heading eyebrow={`${detail.category.toUpperCase()} · LOT ${detail.itemId}`} title={detail.name} /><Badge text={detail.availability} /><Text style={s.body}>Best before: {detail.expirationDate || 'No expiry date applies'}</Text><View style={s.card}><View style={s.rowBetween}><Text style={s.subtitle}>On the shelf</Text><Text style={s.subtitle}>{detail.quantity} units</Text></View><Text style={s.body}>Each item counts as one unit of your weekly allowance. Availability is confirmed when your request is approved.</Text></View><Quota me={me} selected={units} /><Text style={s.subtitle}>Quantity in your basket</Text><Stepper name={detail.name} value={cart[detail.itemId] || 0} max={maxFor(itemsById.get(detail.itemId) || detail)} onChange={qty => change(itemsById.get(detail.itemId) || detail, qty)} /><Button title={`View basket · ${units} ${units === 1 ? 'unit' : 'units'}`} disabled={!units} onPress={() => navigate('basket')} /></> : null}
      {tab === 'basket' ? result ? <><Heading eyebrow={`REQUEST #${result.id}`} title="Your request is in." description="The pantry team will review it in arrival order." /><Badge text={result.status} /><Notice text="Stock and your weekly allowance are confirmed at approval. You can follow the request in your history." /><RequestCard request={result} /><Button title="View my requests" onPress={() => navigate('requests')} /><Button title="Back to browse" secondary onPress={() => navigate('browse')} /></> : <>
        <Heading eyebrow={review ? 'ONE LAST LOOK' : 'YOUR WEEK, A LITTLE EASIER'} title={review ? 'Ready to request?' : 'Your basket.'} description="Nothing is reserved until the pantry team approves your request." />
        <Quota me={me} selected={units} />
        {units === 0 ? <><Empty title="A little room for essentials." detail="Your basket is empty. Explore what’s on the shelves." /><Button title="Browse essentials" onPress={() => navigate('browse')} /></> : <>
          {Object.entries(cart).filter(([, qty]) => qty > 0).map(([id, qty]) => { const item = itemsById.get(Number(id)); return <View key={id} style={s.card}><View style={s.rowBetween}><Text style={s.subtitle}>{item?.name || `Unavailable lot #${id}`}</Text><Text style={s.subtitle}>{qty} units</Text></View>{item ? <><Badge text={item.availability} />{!review ? <Stepper name={item.name} value={qty} max={maxFor(item)} onChange={value => change(item, value)} /> : null}</> : <Button title="Remove unavailable item" secondary onPress={() => setCart(previous => { const next = { ...previous }; delete next[Number(id)]; return next; })} />}</View>; })}
          {!basketValid ? <Notice error text="Your basket has changed availability or exceeds your allowance. Refresh and adjust the quantities before submitting." /> : null}
          <View style={s.rowBetween}><Text style={s.subtitle}>Total requested</Text><Text style={s.subtitle}>{units} of {me.remainingUnits} available</Text></View>
          <Button title={review ? 'Submit request' : 'Review request'} disabled={!basketValid} busy={busy} onPress={() => review ? void submit() : setReview(true)} />
          {review ? <Button title="Edit basket" secondary disabled={busy} onPress={() => setReview(false)} /> : null}
        </>}
      </> : null}
      {tab === 'requests' ? <><Heading eyebrow="YOUR PANTRY HISTORY" title="My requests." description="Pull down to refresh decisions from the pantry team." />{requests.length ? requests.map(request => <RequestCard key={request.id} request={request} />) : <Empty title="Your first request starts here." detail="Choose some essentials, then submit your basket for review." />}</> : null}
      {tab === 'account' ? <><Heading eyebrow={me.role === 'ADMIN' ? 'PANTRY ADMINISTRATOR' : 'YOUR ACCOUNT'} title={`Hello, ${me.displayName}.`} /><Quota me={me} selected={units} /><View style={s.card}><Field label="Display name" value={newName} onChangeText={setNewName} maxLength={80} /><Button title="Save name" onPress={() => void saveName()} disabled={!newName.trim() || newName.trim() === me.displayName} busy={busy} /></View><Text style={s.small}>Weekly allowance follows America/Chicago time. A pending request uses no allowance until it is approved.</Text><Button title="Sign out" secondary onPress={() => void signOut()} /></> : null}
      {tab === 'admin' && me.role === 'ADMIN' ? <AdminScreen onChanged={() => void refresh()} /> : null}
    </ScrollView>
    {tab === 'browse' && units > 0 ? <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}><Button title={`Your basket · ${units} ${units === 1 ? 'unit' : 'units'} →`} onPress={() => navigate('basket')} /></View> : null}
    <View style={s.tabs}>{(['browse', 'basket', 'requests', ...(me.role === 'ADMIN' ? ['admin'] : []), 'account'] as Tab[]).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => navigate(value)} style={[s.tab, tab === value && { backgroundColor: colors.mint }]}><Text style={[s.tabLabel, tab === value && { color: colors.green }]}>{value === 'basket' ? `Basket (${units})` : value.charAt(0).toUpperCase() + value.slice(1)}</Text></Pressable>)}</View>
    </>}
  </View>;
}

export function RequestCard({ request }: { request: PantryRequest }) { return <View style={s.card}><View style={s.rowBetween}><Text style={s.subtitle}>Request #{request.id}</Text><Badge text={request.status} /></View><Text style={s.small}>{new Date(request.submittedAt).toLocaleString()} · {request.totalUnits} units</Text>{request.lines.map(line => <View key={line.itemId} style={s.rowBetween}><Text style={[s.body, { flex: 1 }]}>{line.name}</Text><Text style={s.body}>× {line.quantity}</Text></View>)}{request.decisionReason ? <Notice text={request.decisionReason} error={request.status === 'DECLINED'} /> : null}</View>; }
