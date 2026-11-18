import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, ApiFailure } from './api';
import { AdminQueue } from './AdminQueue';
import type { Inspection, Item, Movement, PantryRequest, Report } from './types';
import { Badge, Button, colors, Disclosure, Empty, Field, Icon, IconButton, Notice, s } from './ui';

export type StaffPanel = 'queue' | 'inventory' | 'reports' | 'inspections';
const panelNames: Record<StaffPanel, string> = {
  queue: 'Incoming requests', inventory: 'Inventory', reports: 'Reports', inspections: 'Inspections',
};
function integer(value: string, allowZero = false) {
  if (!/^\d+$/.test(value)) throw new Error('Enter a whole number.');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > 2147483647 || number < (allowZero ? 0 : 1)) throw new Error('Enter a valid positive quantity or ID.');
  return number;
}
export function AdminScreen({ panel, onPanel, refreshKey, onBusy, onDenied }: {
  panel: StaffPanel; onPanel: (panel: StaffPanel) => void; refreshKey: number; onBusy: (busy: boolean) => void; onDenied: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
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
        const queue = await api<PantryRequest[]>('/admin/requests', 'GET', undefined, signal);
        if (signal.aborted) return;
        const stock = await api<Item[]>('/items?sort=id', 'GET', undefined, signal);
        if (!signal.aborted) { setRequests(queue); setItems(stock); setQueueReady(true); }
      }
      if (panel === 'inventory') { const data = await api<Item[]>('/items?sort=name', 'GET', undefined, signal); if (!signal?.aborted) setItems(data); }
      if (panel === 'reports') {
        const r = await api<Report>('/admin/reports/inventory', 'GET', undefined, signal);
        if (signal.aborted) return;
        const m = await api<Movement[]>('/admin/stock-movements', 'GET', undefined, signal);
        if (!signal?.aborted) { setReport(r); setMovements(m); }
      }
      if (panel === 'inspections') { const data = await api<Inspection[]>('/admin/inspections', 'GET', undefined, signal); if (!signal?.aborted) setInspections(data); }
    } catch (e) {
      if (!signal.aborted) {
        if (e instanceof ApiFailure && e.status === 403) onDenied();
        else setError(e instanceof Error ? e.message : 'Could not load this view.');
      }
    }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => { void load(); return () => activeLoad.current?.abort(); }, [panel, refreshKey]);
  useEffect(() => { setMessage(''); }, [panel]);
  async function perform(action: () => Promise<void>) {
    if (operationInFlight.current) return; operationInFlight.current = true; onBusy(true); setBusy(true); setError(''); setMessage('');
    try { await action(); await load(); }
    catch (e) {
      if (e instanceof ApiFailure && e.status === 403) { onDenied(); return; }
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
  return <View style={s.stack}>
    <View style={s.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Admin sections, ${panelNames[panel]}`} accessibilityState={{ expanded: menuOpen }}
        disabled={busy} style={[s.grow, s.row, { minHeight: 44 }]} onPress={() => setMenuOpen(!menuOpen)}>
        <Text accessibilityRole="header" style={[s.title, { flexShrink: 1 }]}>{panelNames[panel]}</Text>
        <Icon name={menuOpen ? 'expand-less' : 'expand-more'} />
      </Pressable>
      <IconButton label="Refresh" name="refresh" onPress={() => void load()} disabled={busy || loading} />
    </View>
    {menuOpen && <View style={s.card}>{(Object.keys(panelNames) as StaffPanel[]).map(key =>
      <Pressable accessibilityRole="button" accessibilityLabel={panelNames[key]} accessibilityState={{ selected: key === panel }} key={key} style={s.disclosureRow}
        onPress={() => { setMenuOpen(false); onPanel(key); }}>
        <Text style={[s.label, s.grow]}>{panelNames[key]}</Text><Icon name={key === panel ? 'check' : 'chevron-right'} />
      </Pressable>)}</View>}
    {error ? <Notice error text={error} /> : null}{message ? <Notice text={message} /> : null}
    {panel === 'queue' && <AdminQueue requests={requests} items={items} busy={busy || loading || Boolean(error)} ready={queueReady} onDecide={(id, action, reason) => void decide(id, action, reason)} />}
    {panel === 'inventory' && <>
      <Button title={add ? 'Close form' : 'Add a lot'} icon={add ? 'close' : 'add'} onPress={() => setAdd(!add)} secondary />
      {add && <View style={s.card}>
        <Field label="Lot ID" keyboardType="number-pad" value={lot.id} onChangeText={id => setLot(p => ({ ...p, id }))} />
        <Field label="Product name" maxLength={120} value={lot.name} onChangeText={name => setLot(p => ({ ...p, name }))} />
        <View style={s.row}>{['Food', 'Hygiene'].map(category => <Pressable key={category} accessibilityRole="button"
          accessibilityState={{ selected: lot.category === category }} onPress={() => setLot(p => ({ ...p, category }))}
          style={[s.chip, lot.category === category && s.chipActive]}>
          <Text style={[s.chipText, lot.category === category && { color: colors.white }]}>{category}</Text>
        </Pressable>)}</View>
        <Field label="Starting quantity" value={lot.quantity} keyboardType="number-pad" onChangeText={quantity => setLot(p => ({ ...p, quantity }))} />
        <Field label="Expiry date (optional)" value={lot.date} onChangeText={date => setLot(p => ({ ...p, date }))} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <Button title="Add lot" onPress={() => void createLot()} busy={busy} disabled={!lot.name.trim() || !lot.id || !lot.quantity} />
      </View>}
      {items.map(item => <View key={item.itemId} style={s.card}>
        <View style={s.rowBetween}><Text style={[s.subtitle, s.grow]}>{item.name}</Text><Text style={s.emphasis}>{item.quantity} units</Text></View>
        <View style={s.rowBetween}><Text style={s.small}>Lot #{item.itemId}</Text><Badge text={item.availability} /></View>
        <Disclosure title="Lot details">
          <Text style={s.small}>{item.category}{item.expirationDate && ' · Expires ' + item.expirationDate}</Text>
          {restockId === item.itemId ? <>
            <Field label="Units to add" keyboardType="number-pad" value={restockQty} onChangeText={setRestockQty} />
            <Button title="Confirm restock" busy={busy} disabled={!restockQty} onPress={() => void perform(async () => {
              await api(`/admin/items/${item.itemId}/restocks`, 'POST', { quantity: integer(restockQty) });
              setRestockId(null); setRestockQty(''); setMessage(`${item.name} restocked.`);
            })} /><Button title="Cancel" secondary onPress={() => setRestockId(null)} />
          </> : <Button title="Restock" secondary disabled={item.availability === 'EXPIRED'} onPress={() => { setRestockId(item.itemId); setRestockQty(''); }} />}
        </Disclosure>
      </View>)}
      {confirmExpired ? <View style={s.card}><Notice text="Archive all expired lots and remove their remaining stock?" />
        <Button title="Archive expired lots" busy={busy} onPress={() => void perform(async () => {
          const result = await api<{ removedCount: number }>('/admin/inventory/remove-expired', 'POST', {});
          setConfirmExpired(false); setMessage(`${result.removedCount} expired lots archived.`);
        })} /><Button title="Cancel" secondary onPress={() => setConfirmExpired(false)} />
      </View> : <Button title="Archive expired lots…" secondary disabled={busy || !items.some(i => i.availability === 'EXPIRED')} onPress={() => setConfirmExpired(true)} />}
    </>}
    {panel === 'reports' && report && <>
      <View style={s.card}><Text style={s.title}>{report.totalUnits} units</Text><Text style={s.small}>{report.totalLots} active lots · {report.asOf}</Text></View>
      <View style={s.card}>
        {([['Low stock', report.lowStock], ['Out of stock', report.outOfStock], ['Expired', report.expired]] as const).map(([label, list]) =>
          <Disclosure key={label} title={`${label} (${list.length})`}>
            {list.length ? list.map(item => <View key={item.itemId} style={s.rowBetween}>
              <Text style={s.body}>{item.name} · #{item.itemId}</Text><Text style={s.emphasis}>{item.quantity}</Text>
            </View>) : <Text style={s.small}>No lots</Text>}
          </Disclosure>)}
        <Disclosure title={`Stock movements (${movements.length})`}>{movements.length ? movements.map(movement =>
          <View key={movement.id} style={s.tight}><View style={s.rowBetween}><Text style={s.label}>{movement.name}</Text><Text style={s.emphasis}>{movement.delta > 0 ? '+' : ''}{movement.delta}</Text></View>
            <Text style={s.small}>{movement.reason.replaceAll('_', ' ').toLowerCase()} · {new Date(movement.created_at).toLocaleDateString()}</Text>
          </View>) : <Text style={s.small}>No movements yet</Text>}</Disclosure>
      </View>
    </>}
    {panel === 'inspections' && <>
      <View style={s.card}><Disclosure title="Record an inspection">
        <Field label="Hygiene" multiline maxLength={2000} value={inspection.hygiene} onChangeText={hygiene => setInspection(p => ({ ...p, hygiene }))} />
        <Field label="Damaged products" multiline maxLength={2000} value={inspection.damagedProducts} onChangeText={damagedProducts => setInspection(p => ({ ...p, damagedProducts }))} />
        <Field label="Cleanliness" multiline maxLength={2000} value={inspection.cleanliness} onChangeText={cleanliness => setInspection(p => ({ ...p, cleanliness }))} />
        <Field label="Notes (optional)" multiline maxLength={4000} value={inspection.notes} onChangeText={notes => setInspection(p => ({ ...p, notes }))} />
        <Button title="Save inspection" busy={busy} disabled={!inspection.hygiene.trim() || !inspection.damagedProducts.trim() || !inspection.cleanliness.trim()} onPress={() => void perform(async () => {
          await api('/admin/inspections', 'POST', inspection);
          setInspection({ hygiene: '', damagedProducts: '', cleanliness: '', notes: '' }); setMessage('Inspection recorded.');
        })} />
      </Disclosure></View>
      {inspections.map(log => <View key={log.id} style={s.card}><Text style={s.small}>{log.display_name} · {new Date(log.created_at).toLocaleDateString()}</Text>
        <Disclosure title={`Inspection #${log.id}`}>
          <Text style={s.label}>Hygiene</Text><Text style={s.body}>{log.hygiene}</Text>
          <Text style={s.label}>Damaged products</Text><Text style={s.body}>{log.damaged_products}</Text>
          <Text style={s.label}>Cleanliness</Text><Text style={s.body}>{log.cleanliness}</Text>
          {log.notes && <Text style={s.body}>{log.notes}</Text>}
        </Disclosure>
      </View>)}
      {!loading && !error && !inspections.length && <Empty title="No inspections yet" />}
    </>}
  </View>;
}
