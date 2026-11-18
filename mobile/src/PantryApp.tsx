import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { AdminScreen, type StaffPanel } from './AdminScreen';
import { api, ApiFailure } from './api';
import { Basket, SubmissionResult } from './Basket';
import { basketUnits, lineLimit, requestLines, setQuantity, units, validBasket } from './basket';
import { Reveal } from './motion';
import { defaultFilters, Detail, Shelf } from './Shelf';
import { supabase } from './supabase';
import type { Cart, Item, Me, PantryRequest, SubmitRequest } from './types';
import { Brand, Button, colors, Empty, Field, Heading, Icon, Notice, Quota, RequestCard, s, type IconName } from './ui';

type Tab = 'browse' | 'requests' | 'profile' | 'admin';
type Page = { kind: Tab | 'basket' | 'review' } | { kind: 'detail' | 'result'; id: number };
const labels = { browse: 'Browse', detail: 'Item detail', basket: 'Basket', review: 'Review request', result: 'Submission result', requests: 'My requests', profile: 'Profile', admin: 'Staff administration' };
const tabs: { kind: Tab; icon: IconName; label: string }[] = [
  { kind: 'browse', icon: 'storefront', label: 'Browse' }, { kind: 'requests', icon: 'inbox', label: 'Requests' },
  { kind: 'admin', icon: 'fact-check', label: 'Admin' }, { kind: 'profile', icon: 'account-circle', label: 'Profile' },
];

const staffTabs: { kind: StaffPanel; icon: IconName; label: string }[] = [
  { kind: 'queue', icon: 'fact-check', label: 'Requests' }, { kind: 'inventory', icon: 'inventory-2', label: 'Inventory' },
  { kind: 'reports', icon: 'bar-chart', label: 'Reports' }, { kind: 'inspections', icon: 'assignment', label: 'Inspections' },
];

type NavItem = { kind: string; label: string; icon: IconName; active: boolean; select: () => void };

function TabBar({ items, disabled }: { items: NavItem[]; disabled: boolean }) {
  return <View accessibilityRole="tablist" style={s.tabs}>{items.map(item =>
    <Pressable key={item.kind} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: item.active, disabled }}
      disabled={disabled} onPress={item.select} style={s.tab}>
      <View style={[s.tabIcon, item.active && s.solid]}><Icon name={item.icon} color={item.active ? colors.white : colors.muted} /></View>
      <Text style={[s.tabLabel, item.active && { color: colors.green }]}>{item.label}</Text>
    </Pressable>)}</View>;
}

function usePage(locked: React.RefObject<boolean>) {
  const [page, setPage] = useState<Page>({ kind: 'browse' });
  const stack = useRef<Page[]>([{ kind: 'browse' }]);
  const position = useRef(0);
  const [session] = useState(() => Math.random().toString(36).slice(2));
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    window.history.replaceState({ ...window.history.state, pantry: session, position: 0 }, '');
    const restore = (event: PopStateEvent) => {
      if (event.state?.pantry !== session) return;
      const index = event.state.position;
      const previous = stack.current[index];
      if (previous) { position.current = index; setPage(previous); }
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [session]);
  const go = (next: Page, replace = false) => {
    const index = replace ? position.current : position.current + 1;
    stack.current.splice(index, stack.current.length - index, next);
    position.current = index;
    if (Platform.OS === 'web') {
      const state = { ...window.history.state, pantry: session, position: index };
      if (replace) window.history.replaceState(state, ''); else window.history.pushState(state, '');
    }
    setPage(next);
  };
  const back = useCallback(() => {
    if (locked.current) return true;
    if (!position.current) return false;
    if (Platform.OS === 'web') window.history.back();
    else { position.current--; setPage(stack.current[position.current]!); }
    return true;
  }, [locked]);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);
  return { page, go, back };
}

export function PantryApp() {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [requests, setRequests] = useState<PantryRequest[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [filters, setFilters] = useState(defaultFilters);
  const [draftQuantity, setDraftQuantity] = useState(1);
  const [lastSaved, setLastSaved] = useState<PantryRequest | null>(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [refreshing, setRefreshing] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [staffPanel, setStaffPanel] = useState<StaffPanel>('queue');
  const [staffBusy, setStaffBusy] = useState(false);
  const [adminRefresh, setAdminRefresh] = useState(0);
  const [name, setName] = useState<string | null>(null);
  const activeLoad = useRef<AbortController | null>(null);
  const submission = useRef<{ basket: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const { page, go, back } = usePage(inFlight);

  const refresh = useCallback(async () => {
    activeLoad.current?.abort();
    const controller = new AbortController();
    const { signal } = controller;
    activeLoad.current = controller;
    setRefreshing(true); setLoadError('');
    try {
      const [profile, stock, history] = await Promise.all([
        api<Me>('/me', 'GET', undefined, signal),
        api<Item[]>('/items?sort=id', 'GET', undefined, signal),
        api<PantryRequest[]>('/requests/mine', 'GET', undefined, signal),
      ]);
      if (!signal.aborted) { setMe(profile); setItems(stock); setRequests(history); }
    } catch (e) {
      if (!signal.aborted) setLoadError(e instanceof Error ? e.message : 'Could not load your pantry.');
    } finally { if (!signal.aborted) setRefreshing(false); }
  }, []);

  useEffect(() => {
    void refresh();
    return () => activeLoad.current?.abort();
  }, [refresh]);
  useEffect(() => {
    setActionError('');
    if (page.kind === 'requests' || page.kind === 'review') void refresh();
  }, [page, refresh]);

  const byId = new Map(items.map(item => [item.itemId, item]));
  const total = basketUnits(cart);
  const kinds = Object.keys(cart).length;
  const detail = page.kind === 'detail' ? byId.get(page.id) : undefined;
  const inBasket = detail ? cart[detail.itemId] ?? 0 : 0;
  const room = detail && me ? Math.max(0, lineLimit(cart, detail, me.remainingUnits) - inBasket) : 0;
  const amount = Math.min(room, draftQuantity);
  const result = page.kind === 'result' ? requests.find(row => row.id === page.id) ?? (lastSaved?.id === page.id ? lastSaved : undefined) : undefined;
  const valid = me !== null && validBasket(cart, byId, me);
  const contextual = ['detail', 'basket', 'review', 'result'].includes(page.kind);

  function change(id: number, quantity: number) {
    if (!me || inFlight.current) return;
    const item = byId.get(id);
    setCart(current => setQuantity(current, id, item ? Math.min(quantity, lineLimit(current, item, me.remainingUnits)) : 0));
  }
  function add(item: Item, count: number) {
    if (!me || inFlight.current) return;
    setCart(current => setQuantity(current, item.itemId, Math.min((current[item.itemId] ?? 0) + count, lineLimit(current, item, me.remainingUnits))));
  }
  function pull() {
    void refresh();
    if (page.kind === 'admin') setAdminRefresh(key => key + 1);
  }
  async function submit() {
    if (!valid || inFlight.current) return;
    inFlight.current = true; setSending(true); setActionError('');
    try {
      const lines = requestLines(cart);
      const basket = JSON.stringify(lines);
      if (submission.current?.basket !== basket) {
        // Scoped to this account and basket; Java enforces uniqueness and checks the lines on replay.
        const key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.floor(Math.random() * 16);
          return (c === 'x' ? r : (r & 3) | 8).toString(16);
        });
        submission.current = { basket, key };
      }
      const saved = await api<PantryRequest>('/requests', 'POST', { lines, idempotencyKey: submission.current.key } satisfies SubmitRequest);
      setLastSaved(saved); setRequests(current => [saved, ...current.filter(row => row.id !== saved.id)]);
      setCart({}); submission.current = null;
      go({ kind: 'result', id: saved.id }, true);
      void refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not submit. Retry with the same basket.');
      if (e instanceof ApiFailure && e.status === 409) void refresh();
    } finally { inFlight.current = false; setSending(false); }
  }

  async function saveName() {
    if (!name?.trim() || savingName) return;
    setSavingName(true); setActionError('');
    try { setMe(await api<Me>('/me', 'PATCH', { displayName: name.trim() })); setName(null); }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Could not save your name.'); }
    finally { setSavingName(false); }
  }
  async function signOut() {
    const { error } = await supabase!.auth.signOut();
    if (error) setActionError(error.message);
  }

  return <View style={s.container}>
    <Brand subtitle={`Roosevelt University · ${labels[page.kind]}`} disabled={sending || staffBusy}
      onBack={contextual || page.kind === 'admin' ? back : undefined} onProfile={me && page.kind !== 'profile' ? () => go({ kind: 'profile' }) : undefined} />
    {!me ? <View style={s.content}>{refreshing ? <ActivityIndicator accessibilityLabel="Loading pantry" color={colors.green} /> : <>
      <Notice error text={loadError || 'Unable to load your pantry.'} /><Button title="Try again" onPress={() => void refresh()} />
      <Button title="Sign out" secondary onPress={() => void signOut()} /></>}{actionError && <Notice error text={actionError} />}</View> : <>
      <ScrollView key={'id' in page ? `${page.kind}-${page.id}` : page.kind} style={s.grow} keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.green} />}>
        {loadError && <View style={s.tight}><Notice error text={loadError} /><Button secondary title="Retry connection" onPress={pull} /></View>}
        {actionError && <Notice error text={actionError} />}
        <Reveal event={page.kind} style={s.stack} testID="screen-content">
          {page.kind === 'browse' && <Shelf items={items} me={me} cart={cart} filters={filters} onFilter={setFilters}
            onOpen={id => { setDraftQuantity(1); go({ kind: 'detail', id }); }} onAdd={item => add(item, 1)} onRefresh={pull} />}
          {page.kind === 'detail' && (detail ? <Detail item={detail} me={me} inBasket={inBasket} availableToAdd={room} amount={amount} onAmount={setDraftQuantity} />
            : <Empty title="Lot unavailable" detail="The pantry team has removed this lot from the shelves." />)}
          {(page.kind === 'basket' || page.kind === 'review') && <Basket me={me} cart={cart} items={byId} review={page.kind === 'review'}
            valid={valid} onChange={change} onClear={() => setCart({})} />}
          {page.kind === 'result' && (result ? <SubmissionResult me={me} request={result} /> : <Notice text="Open My requests to see the latest decision." />)}
          {page.kind === 'requests' && <>
            <View style={s.rowBetween}><Heading title="My requests" /><Button secondary title="Refresh status" icon="refresh" busy={refreshing} onPress={pull} /></View>
            {requests.length ? requests.map(row => <RequestCard key={row.id} request={row} />) : <Empty title="No requests yet" detail="Select items and submit your basket to start a request." />}
          </>}
          {page.kind === 'profile' && <>
            <Heading eyebrow={me.role === 'ADMIN' ? 'Administrator' : 'Member'} title={me.displayName} /><Quota me={me} />
            <View style={s.card}><Field label="Display name" value={name ?? me.displayName} maxLength={80} onChangeText={setName} />
              <Button title="Save name" onPress={() => void saveName()} busy={savingName} disabled={!name?.trim() || name.trim() === me.displayName} /></View>
            <Button secondary title="Sign out" onPress={() => void signOut()} />
          </>}
          {page.kind === 'admin' && me.role === 'ADMIN' && <AdminScreen panel={staffPanel} onBusy={setStaffBusy} refreshKey={adminRefresh} onChanged={() => void refresh()} />}
        </Reveal>
      </ScrollView>

      {page.kind === 'browse' && <View style={[s.dock, s.rowBetween]}>
        <View style={s.grow}><Text style={s.emphasis}>Basket · {units(total)}</Text>
          <Text style={s.small}>{kinds} {kinds === 1 ? 'lot' : 'lots'} selected</Text></View>
        <Button title="View basket" icon="shopping-basket" onPress={() => go({ kind: 'basket' })} />
      </View>}
      {page.kind === 'detail' && <View style={s.dock}>{detail && room > 0
        ? <Button title={`Add ${units(amount)} to basket`} icon="shopping-basket" onPress={() => { add(detail, amount); go({ kind: 'basket' }); }} />
        : <Button secondary title={total ? 'View basket' : 'Back to browse'} onPress={() => go({ kind: total ? 'basket' : 'browse' })} />}</View>}
      {page.kind === 'basket' && <View style={s.dock}>
        {total > 0 && <Button title="Proceed to review request" icon="arrow-forward" disabled={!valid} onPress={() => go({ kind: 'review' })} />}
        <Button secondary title={total ? 'Add more items' : 'Browse items'} onPress={() => go({ kind: 'browse' })} />
      </View>}
      {page.kind === 'review' && <View style={s.dock}><Button title={`Submit request (${units(total)})`} disabled={!valid || refreshing} busy={sending}
        onPress={() => void submit()} /><Button secondary title="Edit basket" disabled={sending} onPress={() => go({ kind: 'basket' }, true)} /></View>}
      {page.kind === 'result' && <View style={s.dock}><Button title="View my requests" icon="inbox" onPress={() => go({ kind: 'requests' })} /></View>}
      {!contextual && <TabBar disabled={staffBusy} items={page.kind === 'admin'
        ? staffTabs.map(tab => ({ ...tab, active: staffPanel === tab.kind, select: () => setStaffPanel(tab.kind) }))
        : tabs.filter(tab => tab.kind !== 'admin' || me.role === 'ADMIN').map(tab => ({
          ...tab, active: page.kind === tab.kind, select: () => { if (page.kind !== tab.kind) go({ kind: tab.kind }); },
        }))} />}
    </>}
  </View>;
}
