import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, ApiFailure } from './api';
import { AdminQueue } from './AdminQueue';
import type { Inspection, Item, Movement, PantryRequest, Report } from './types';
import { Badge, Button, colors, Empty, Field, Heading, Notice, s } from './ui';

export type StaffPanel = 'queue' | 'inventory' | 'reports' | 'inspections';
function integer(value: string, allowZero = false) {
  if (!/^\d+$/.test(value)) throw new Error('Enter a whole number.');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > 2147483647 || number < (allowZero ? 0 : 1)) throw new Error('Enter a valid positive quantity or ID.');
  return number;
}
export function AdminScreen({ panel, onChanged, refreshKey, onBusy }: {
  panel: StaffPanel; onChanged: () => void; refreshKey: number; onBusy: (busy: boolean) => void;
}) {
  const [requests, setRequests] = useState<PantryRequest[]>([]);
  const [items, setItems] = useState<Item[]>([]); const [report, setReport] = useState<Report | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]); const [movements, setMovements] = useState<Movement[]>([]);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [queueReady, setQueueReady] = useState(false); const [restockId, setRestockId] = useState<number | null>(null); const [restockQty, setRestockQty] = useState('');
  const [confirmExpired, setConfirmExpired] = useState(false); const [add, setAdd] = useState(false);
  const [lot, setLot] = useState({ id: '', name: '', category: 'Food', quantity: '', date: '' });
  const [inspection, setInspection] = useState({ hygiene: '', damagedProducts: '', cleanliness: '', notes: '' });
  const operationInFlight = useRef(false);
  const activeLoad = useRef<AbortController | null>(null);
  async function load() {
    activeLoad.current?.abort();
    const controller = new AbortController();
    activeLoad.current = controller;
    const { signal } = controller;
    setLoading(true); setError('');
    try {
      if (panel === 'queue') {
        const [queue, stock] = await Promise.all([api<PantryRequest[]>('/admin/requests', 'GET', undefined, signal), api<Item[]>('/items?sort=id', 'GET', undefined, signal)]);
        if (!signal.aborted) { setRequests(queue); setItems(stock); setQueueReady(true); }
      }
      if (panel === 'inventory') { const data = await api<Item[]>('/items?sort=name', 'GET', undefined, signal); if (!signal?.aborted) setItems(data); }
      if (panel === 'reports') {
        const [r, m] = await Promise.all([api<Report>('/admin/reports/inventory', 'GET', undefined, signal), api<Movement[]>('/admin/stock-movements', 'GET', undefined, signal)]);
        if (!signal?.aborted) { setReport(r); setMovements(m); }
      }
      if (panel === 'inspections') { const data = await api<Inspection[]>('/admin/inspections', 'GET', undefined, signal); if (!signal?.aborted) setInspections(data); }
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Could not load this view.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => { void load(); return () => activeLoad.current?.abort(); }, [panel, refreshKey]);
  useEffect(() => { setMessage(''); }, [panel]);
  async function perform(action: () => Promise<void>) {
    if (operationInFlight.current) return; operationInFlight.current = true; onBusy(true); setBusy(true); setError(''); setMessage('');
    try { await action(); await load(); onChanged(); }
    catch (e) {
      if (e instanceof ApiFailure && e.status === 409) await load();
      setError(e instanceof Error ? e.message : 'The change could not be saved.');
    }
    finally { operationInFlight.current = false; onBusy(false); setBusy(false); }
  }
  async function decide(id: number, action: 'APPROVE' | 'DECLINE', reason?: string) {
    await perform(async () => {
      const result = await api<PantryRequest>(`/admin/requests/${id}/decision`, 'POST', { action, ...(reason ? { reason } : {}) });
      setMessage(`Request #${result.id} was ${result.status.toLowerCase()}.${result.decisionReason ? ' ' + result.decisionReason : ''}`);
    });
  }
  async function createLot() {
    await perform(async () => {
      if (lot.date && (!/^\d{4}-\d{2}-\d{2}$/.test(lot.date) || new Date(`${lot.date}T12:00:00Z`).toISOString().slice(0, 10) !== lot.date)) throw new Error('Use a valid date in YYYY-MM-DD format.');
      await api('/admin/items', 'POST', { itemId: integer(lot.id), name: lot.name.trim(), category: lot.category, quantity: integer(lot.quantity, true), expirationDate: lot.date || null });
      setAdd(false); setLot({ id: '', name: '', category: 'Food', quantity: '', date: '' }); setMessage('New lot added.');
    });
  }
  return <View style={{ gap: 20 }}>
    <View style={s.rowBetween}><Heading eyebrow="Staff administration" title={panel === 'queue' ? 'Incoming requests' : panel.charAt(0).toUpperCase() + panel.slice(1)} />
      <Button title="Refresh" icon="refresh" secondary onPress={() => void load()} busy={loading} disabled={busy} /></View>
    {error ? <Notice error text={error} /> : null}{message ? <Notice text={message} /> : null}
    {panel === 'queue' && <AdminQueue requests={requests} items={items} busy={busy || loading || Boolean(error)} ready={queueReady} onDecide={(id, action, reason) => void decide(id, action, reason)} />}
    {panel === 'inventory' ? <>
      <Button title={add ? 'Close new lot form' : '+ Add a new lot'} onPress={() => setAdd(!add)} secondary />
      {add ? <View style={s.card}><Text style={s.subtitle}>A new lot</Text><Field label="Unique lot ID" keyboardType="number-pad" value={lot.id} onChangeText={id => setLot(p => ({ ...p, id }))} /><Field label="Product name" maxLength={120} value={lot.name} onChangeText={name => setLot(p => ({ ...p, name }))} /><View style={{ flexDirection: 'row', gap: 8 }}>{['Food', 'Hygiene'].map(category => <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected: lot.category === category }} onPress={() => setLot(p => ({ ...p, category }))} style={[s.chip, lot.category === category && s.chipActive]}><Text style={[s.chipText, lot.category === category && { color: 'white' }]}>{category}</Text></Pressable>)}</View><Field label="Starting quantity" value={lot.quantity} keyboardType="number-pad" onChangeText={quantity => setLot(p => ({ ...p, quantity }))} /><Field label="Expiry date (optional, YYYY-MM-DD)" value={lot.date} onChangeText={date => setLot(p => ({ ...p, date }))} placeholder="2027-06-30" autoCapitalize="none" /><Button title="Add lot" onPress={() => void createLot()} busy={busy} disabled={!lot.name.trim() || !lot.id || !lot.quantity} /></View> : null}
      {items.map(item => <View key={item.itemId} style={s.card}><Text style={s.eyebrow}>LOT {item.itemId} · {item.category.toUpperCase()}</Text><View style={s.rowBetween}><Text style={[s.subtitle, { flex: 1 }]}>{item.name}</Text><Text style={s.subtitle}>{item.quantity} units</Text></View><Badge text={item.availability} /><Text style={s.small}>Expiry: {item.expirationDate || 'None'}</Text>{restockId === item.itemId ? <><Field label="Units to add to this lot" keyboardType="number-pad" value={restockQty} onChangeText={setRestockQty} /><Button title="Confirm restock" busy={busy} disabled={!restockQty} onPress={() => void perform(async () => { await api(`/admin/items/${item.itemId}/restocks`, 'POST', { quantity: integer(restockQty) }); setRestockId(null); setRestockQty(''); setMessage(`${item.name} restocked.`); })} /><Button title="Cancel" secondary onPress={() => setRestockId(null)} /></> : <Button title="Restock this lot" secondary disabled={item.availability === 'EXPIRED'} onPress={() => { setRestockId(item.itemId); setRestockQty(''); }} />}</View>)}
      {confirmExpired ? <View style={s.card}><Notice text="This will archive every expired lot and remove its remaining units from available stock. Request history is kept." /><Button title="Confirm removal of expired stock" busy={busy} onPress={() => void perform(async () => { const result = await api<{ removedCount: number }>('/admin/inventory/remove-expired', 'POST', {}); setConfirmExpired(false); setMessage(`${result.removedCount} expired lots archived.`); })} /><Button title="Cancel" secondary onPress={() => setConfirmExpired(false)} /></View> : <Button title="Remove expired stock…" secondary disabled={busy || !items.some(i => i.availability === 'EXPIRED')} onPress={() => setConfirmExpired(true)} />}
    </> : null}
    {panel === 'reports' && report ? <>
      <View style={s.card}><Text style={s.eyebrow}>INVENTORY · {report.asOf}</Text><Text style={s.title}>{report.totalUnits} units</Text><Text style={s.body}>{report.totalLots} active lots · includes stock awaiting expiry removal</Text></View>
      {([['Low stock', report.lowStock], ['Out of stock', report.outOfStock], ['Expired', report.expired]] as const).map(([label, list]) => <View key={label} style={s.card}><Text style={s.subtitle}>{label} · {list.length} lots</Text>{list.length ? list.map(item => <View key={item.itemId} style={s.rowBetween}><Text style={s.body}>{item.name} · #{item.itemId}</Text><Text style={s.body}>{item.quantity}</Text></View>) : <Text style={s.small}>No lots to report.</Text>}</View>)}
      <Text style={s.subtitle}>Stock movement history</Text>{movements.length ? movements.map(movement => <View key={movement.id} style={s.card}><View style={s.rowBetween}><Text style={s.subtitle}>{movement.name}</Text><Text style={s.subtitle}>{movement.delta > 0 ? '+' : ''}{movement.delta}</Text></View><Text style={s.small}>{movement.reason.replaceAll('_', ' ')} · {new Date(movement.created_at).toLocaleString()}</Text></View>) : <Empty title="No movements yet." detail="Stock entries, approvals and removals will be recorded here." />}
    </> : null}
    {panel === 'inspections' ? <>
      <View style={s.card}><Text style={s.subtitle}>Record an inspection</Text><Field label="Hygiene observations" multiline maxLength={2000} value={inspection.hygiene} onChangeText={hygiene => setInspection(p => ({ ...p, hygiene }))} /><Field label="Damaged products" multiline maxLength={2000} value={inspection.damagedProducts} onChangeText={damagedProducts => setInspection(p => ({ ...p, damagedProducts }))} placeholder="Write ‘None’ if no damage was found." /><Field label="Cleanliness observations" multiline maxLength={2000} value={inspection.cleanliness} onChangeText={cleanliness => setInspection(p => ({ ...p, cleanliness }))} /><Field label="Additional notes (optional)" multiline maxLength={4000} value={inspection.notes} onChangeText={notes => setInspection(p => ({ ...p, notes }))} /><Button title="Save inspection" busy={busy} disabled={!inspection.hygiene.trim() || !inspection.damagedProducts.trim() || !inspection.cleanliness.trim()} onPress={() => void perform(async () => { await api('/admin/inspections', 'POST', inspection); setInspection({ hygiene: '', damagedProducts: '', cleanliness: '', notes: '' }); setMessage('Inspection recorded.'); })} /></View>
      {inspections.map(log => <View key={log.id} style={s.card}><Text style={s.subtitle}>Inspection #{log.id}</Text><Text style={s.small}>{log.display_name} · {new Date(log.created_at).toLocaleString()}</Text><Text style={s.body}>Hygiene: {log.hygiene}</Text><Text style={s.body}>Damaged products: {log.damaged_products}</Text><Text style={s.body}>Cleanliness: {log.cleanliness}</Text>{log.notes ? <Text style={s.body}>Notes: {log.notes}</Text> : null}</View>)}
    </> : null}
  </View>;
}
