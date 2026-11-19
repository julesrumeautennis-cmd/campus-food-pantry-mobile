import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminScreen, type StaffPanel } from './AdminScreen';
import { api, ApiFailure } from './api';
import { Basket, SubmissionResult } from './BasketScreen';
import { basketUnits, lineLimit, requestLines, setQuantity, units, validBasket } from './basket';
import { CartFlight, type Flight } from './CartMotion';
import { Reveal, useMotionAllowed } from './motion';
import { defaultFilters, Detail, Shelf } from './Shelf';
import { supabase } from './supabase';
import type { Cart, Item, Me, PantryRequest, SubmitRequest } from './types';
import { Brand, Button, colors, Disclosure, Empty, Heading, Icon, IconButton, Notice, Quota, RequestCard, s, type IconName } from './ui';

type Tab = 'browse' | 'requests' | 'profile' | 'admin';
type Page = { kind: Tab | 'basket' | 'review' } | { kind: 'detail' | 'result'; id: number };
const tabs: { kind: Tab; icon: IconName; label: string }[] = [
  { kind: 'browse', icon: 'storefront', label: 'Browse' }, { kind: 'requests', icon: 'inbox', label: 'Requests' },
  { kind: 'admin', icon: 'fact-check', label: 'Admin' }, { kind: 'profile', icon: 'account-circle', label: 'Profile' },
];

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
      if (locked.current && index !== position.current) {
        window.history.go(position.current - index);
        return;
      }
      const previous = stack.current[index];
      if (previous) { position.current = index; setPage(previous); }
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [session, locked]);
  const go = useCallback((next: Page, replace = false) => {
    const index = replace ? position.current : position.current + 1;
    stack.current.splice(index, stack.current.length - index, next);
    position.current = index;
    if (Platform.OS === 'web') {
      const state = { ...window.history.state, pantry: session, position: index };
      if (replace) window.history.replaceState(state, ''); else window.history.pushState(state, '');
    }
    setPage(next);
  }, [session]);
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

function ProfileHistory() {
  const [rows, setRows] = useState<PantryRequest[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    api<PantryRequest[]>('/requests/mine', 'GET', undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setRows(data); })
      .catch(() => { if (!controller.signal.aborted) setError('Couldn’t load request history.'); });
    return () => controller.abort();
  }, [attempt]);
  if (error) return <><Notice error text={error} /><Button secondary title="Try again" onPress={() => setAttempt(n => n + 1)} /></>;
  if (!rows) return <ActivityIndicator accessibilityLabel="Loading history" color={colors.green} />;
  return rows.length ? <>{rows.map(row => <RequestCard key={row.id} request={row} />)}</> : <Text style={s.small}>No requests yet</Text>;
}

export function PantryApp({ onInitialReady }: { onInitialReady: () => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [requests, setRequests] = useState<PantryRequest[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [filters, setFilters] = useState(defaultFilters);
  const [draftQuantity, setDraftQuantity] = useState(1);
  const [lastSaved, setLastSaved] = useState<PantryRequest | null>(null);
  const [loadFailure, setLoadFailure] = useState<{ page: Page['kind']; message: string } | null>(null);
  const [loaded, setLoaded] = useState({ stock: false, history: false });
  const [actionError, setActionError] = useState('');
  const [refreshing, setRefreshing] = useState(true);
  const [sending, setSending] = useState(false);
  const [staffPanel, setStaffPanel] = useState<StaffPanel>('queue');
  const [staffBusy, setStaffBusy] = useState(false);
  const [adminRefresh, setAdminRefresh] = useState(0);
  const [flights, setFlights] = useState<Flight[]>([]);
  const flightId = useRef(0);
  const container = useRef<React.ComponentRef<typeof View>>(null);
  const basketButton = useRef<React.ComponentRef<typeof View>>(null);
  const motionAllowed = useMotionAllowed();
  useEffect(() => { if (!motionAllowed) setFlights([]); }, [motionAllowed]);
  const finishFlight = useCallback((id: number) => {
    setFlights(current => current.filter(flight => flight.id !== id));
  }, []);
  const [tabHeight, setTabHeight] = useState(61);
  const { bottom } = useSafeAreaInsets();
  const tabBottom = Math.max(10, bottom + 4);
  const activeLoad = useRef<AbortController | null>(null);
  const submission = useRef<{ basket: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const navigationLocked = useRef(false);
  const { page, go, back } = usePage(navigationLocked);
  const kind = page.kind;
  const loadError = loadFailure?.page === kind ? loadFailure.message : '';
  useEffect(() => {
    if (kind === 'admin' && me?.role === 'MEMBER') go({ kind: 'browse' }, true);
  }, [go, kind, me?.role]);

  function setStaffWorking(busy: boolean) {
    navigationLocked.current = busy;
    setStaffBusy(busy);
  }

  const refresh = useCallback(async () => {
    activeLoad.current?.abort();
    const controller = new AbortController();
    const { signal } = controller;
    activeLoad.current = controller;
    setLoadFailure(null);
    // A successful submission already returned the receipt. Staff panels load their own data.
    if (kind === 'admin' || kind === 'result') { setRefreshing(false); return; }
    setRefreshing(true);
    try {
      if (kind === 'requests') {
        const history = await api<PantryRequest[]>('/requests/mine', 'GET', undefined, signal);
        if (!signal.aborted) { setRequests(history); setLoaded(state => ({ ...state, history: true })); }
      } else {
        const profile = await api<Me>('/me', 'GET', undefined, signal);
        if (signal.aborted) return;
        setMe(profile);
        if (kind !== 'profile') {
          const stock = await api<Item[]>('/items?sort=id', 'GET', undefined, signal);
          if (!signal.aborted) { setItems(stock); setLoaded(state => ({ ...state, stock: true })); }
        }
      }
    } catch (e) {
      if (!signal.aborted) {
        const section = kind === 'requests' ? 'request history' : kind === 'profile' ? 'profile' : 'pantry';
        const detail = e instanceof ApiFailure && e.status === 503 ? 'The pantry is busy. Try again shortly.' : 'Try again.';
        setLoadFailure({ page: kind, message: e instanceof ApiFailure && e.status === 401 ? e.message : `Couldn’t refresh your ${section}. ${detail}` });
      }
    } finally { if (!signal.aborted) setRefreshing(false); }
  }, [kind]);

  useEffect(() => {
    void refresh();
    return () => activeLoad.current?.abort();
  }, [refresh]);
  useEffect(() => {
    if (loaded.stock || loadFailure) onInitialReady();
  }, [loaded.stock, loadFailure, onInitialReady]);
  useEffect(() => {
    setActionError('');
  }, [page]);

  const byId = new Map(items.map(item => [item.itemId, item]));
  const total = basketUnits(cart);
  const detail = page.kind === 'detail' ? byId.get(page.id) : undefined;
  const inBasket = detail ? cart[detail.itemId] ?? 0 : 0;
  const room = detail && me ? Math.max(0, lineLimit(cart, detail, me.remainingUnits) - inBasket) : 0;
  const amount = Math.min(room, draftQuantity);
  const result = page.kind === 'result' ? requests.find(row => row.id === page.id) ?? (lastSaved?.id === page.id ? lastSaved : undefined) : undefined;
  const valid = me !== null && validBasket(cart, byId, me);
  const contextual = ['detail', 'basket', 'review', 'result'].includes(page.kind);
  const activeTab = kind === 'result' ? 'requests' : contextual ? 'browse' : kind;
  const awaitingData = kind === 'requests' ? !loaded.history : ['browse', 'detail', 'basket', 'review'].includes(kind) && !loaded.stock;
  const screenKey = kind === 'admin' ? 'admin-' + staffPanel : 'id' in page ? kind + '-' + page.id : kind;

  function change(id: number, quantity: number) {
    if (!me || inFlight.current) return;
    const item = byId.get(id);
    setCart(current => setQuantity(current, id, item ? Math.min(quantity, lineLimit(current, item, me.remainingUnits)) : 0));
  }
  function add(item: Item, count: number, source: React.ComponentRef<typeof View> | null) {
    if (!me || inFlight.current || (cart[item.itemId] ?? 0) >= lineLimit(cart, item, me.remainingUnits)) return;
    setCart(current => setQuantity(current, item.itemId, Math.min((current[item.itemId] ?? 0) + count, lineLimit(current, item, me.remainingUnits))));
    if (!motionAllowed || !source) return;
    source.measureInWindow((x, y, width, height) => {
      basketButton.current?.measureInWindow((targetX, targetY, targetWidth, targetHeight) => {
        container.current?.measureInWindow((left, top) => {
          if (!width || !height || !targetWidth || !targetHeight) return;
          const flight = { id: ++flightId.current, item,
            from: { x: x + width / 2 - left, y: y + height / 2 - top },
            to: { x: targetX + targetWidth / 2 - left, y: targetY + targetHeight / 2 - top } };
          setFlights(current => [...current, flight]);
        });
      });
    });
  }
  function pull() {
    if (page.kind === 'admin') setAdminRefresh(key => key + 1);
    else void refresh();
  }
  async function submit() {
    if (!valid || refreshing || loadError || inFlight.current) return;
    inFlight.current = true; navigationLocked.current = true; setSending(true); setActionError('');
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
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not submit. Retry with the same basket.');
      if (e instanceof ApiFailure && e.status === 409) void refresh();
    } finally { inFlight.current = false; navigationLocked.current = false; setSending(false); }
  }

  async function signOut() {
    const { error } = await supabase!.auth.signOut();
    if (error) setActionError(error.message);
  }

  return <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View ref={container} collapsable={false} style={s.grow}>
      <Brand basketRef={basketButton} basketUnits={total} inBasket={kind === 'basket'} disabled={sending || staffBusy}
        onBack={contextual ? back : undefined} onBasket={me ? () => go({ kind: 'basket' }) : undefined} />
      {!me ? (refreshing ? <ActivityIndicator accessibilityLabel="Loading pantry" color={colors.green} style={s.container} /> : <View style={s.content}>
        <Notice error text={loadError || 'Unable to load your pantry.'} /><Button title="Try again" onPress={() => void refresh()} />
        <Button title="Sign out" secondary onPress={() => void signOut()} />{actionError && <Notice error text={actionError} />}</View>) : <>
        <ScrollView key={screenKey} style={s.grow} keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.content, { paddingBottom: tabHeight + tabBottom + 22 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.green} />}>
          {loadError && <View style={s.tight}><Notice error text={loadError} /><Button secondary title="Try again" onPress={pull} /></View>}
          {actionError && <Notice error text={actionError} />}
          <Reveal event={screenKey} style={s.stack} testID="screen-content">
            {awaitingData ? !loadError && <ActivityIndicator accessibilityLabel="Loading pantry" color={colors.green} /> : <>
              {page.kind === 'browse' && <Shelf items={items} me={me} cart={cart} filters={filters} onFilter={setFilters}
                onOpen={id => { setDraftQuantity(1); go({ kind: 'detail', id }); }} onAdd={(item, source) => add(item, 1, source)} onRefresh={pull} />}
              {page.kind === 'detail' && (detail ? <Detail item={detail} me={me} inBasket={inBasket} availableToAdd={room} amount={amount} onAmount={setDraftQuantity} />
                : <Empty title="Lot unavailable" detail="The pantry team has removed this lot from the shelves." />)}
              {(page.kind === 'basket' || page.kind === 'review') && <Basket me={me} cart={cart} items={byId} review={page.kind === 'review'}
                valid={valid} onChange={change} onClear={() => setCart({})} />}
              {page.kind === 'result' && (result ? <SubmissionResult me={me} request={result} /> : <Notice text="Open My requests to see the latest decision." />)}
              {page.kind === 'requests' && <>
                <View style={s.rowBetween}><Heading title="My requests" /><IconButton name="refresh" label="Refresh status" disabled={refreshing} onPress={pull} /></View>
                {requests.length ? requests.map(row => <RequestCard key={row.id} request={row} />) : <Empty title="No requests yet" detail="Select items and submit your basket to start a request." />}
              </>}
              {page.kind === 'profile' && <>
                <Heading title={me.displayName} />
                <View style={s.card}>
                  <View style={s.rowBetween}><Text style={s.label}>Role</Text><Text style={s.tag}>{me.role === 'ADMIN' ? 'Admin' : 'Member'}</Text></View>
                  <Disclosure title="Student ID"><Text selectable style={s.body}>{me.userId}</Text></Disclosure>
                </View>
                <Quota me={me} />
                <View style={s.card}><Disclosure title="Request history"><ProfileHistory /></Disclosure></View>
                <Button secondary title="Sign out" onPress={() => void signOut()} />
              </>}
              {page.kind === 'admin' && me.role === 'ADMIN' && <AdminScreen panel={staffPanel} onPanel={setStaffPanel} onBusy={setStaffWorking} refreshKey={adminRefresh}
                onDenied={() => { setMe({ ...me, role: 'MEMBER' }); go({ kind: 'browse' }, true); }} />}
              {page.kind === 'detail' && detail && room > 0 && <Button title={`Add ${units(amount)} to basket`} icon="add" onPress={() => add(detail, amount, null)} />}
              {page.kind === 'basket' && <View style={s.dock}>
                {total > 0 ? <Button title="Review request" icon="arrow-forward" disabled={!valid} onPress={() => go({ kind: 'review' })} />
                  : <Button secondary title="Browse items" onPress={() => go({ kind: 'browse' })} />}
              </View>}
              {page.kind === 'review' && <View style={s.dock}><Button title={`Submit request (${units(total)})`} disabled={!valid || refreshing || !!loadError} busy={sending}
                onPress={() => void submit()} /><Button secondary title="Edit basket" disabled={sending} onPress={() => go({ kind: 'basket' }, true)} /></View>}
              {page.kind === 'result' && <View style={s.dock}><Button title="View my requests" icon="inbox" onPress={() => go({ kind: 'requests' })} /></View>}
            </>}
          </Reveal>
        </ScrollView>
        <View pointerEvents="box-none" style={[s.tabFrame, { bottom: tabBottom }]}>
          <View nativeID="pantry-tabs" accessibilityRole="tablist" style={s.tabs} onLayout={event => setTabHeight(event.nativeEvent.layout.height)}>
            {tabs.filter(tab => tab.kind !== 'admin' || me.role === 'ADMIN').map(tab => {
              const selected = tab.kind === activeTab;
              return <Pressable key={tab.kind} accessibilityRole="tab" accessibilityLabel={tab.label}
                accessibilityState={{ selected, disabled: sending || staffBusy }} disabled={sending || staffBusy}
                style={({ pressed }) => [s.tab, selected && s.tabSelected, pressed && s.pressed]}
                onPress={() => { if (kind !== tab.kind) go({ kind: tab.kind }); }}>
                <Icon name={tab.icon} color={selected ? colors.green : colors.ink} size={22} />
                <Text style={[s.tabLabel, selected && { color: colors.green }]}>{tab.label}</Text>
              </Pressable>;
            })}
          </View>
        </View>
      </>}
      {motionAllowed && flights.map(flight => <CartFlight key={flight.id} flight={flight} onFinish={finishFlight} />)}
    </View>
  </KeyboardAvoidingView>;
}
