import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { units } from './basket';
import { Reveal } from './motion';
import type { Item, PantryRequest } from './types';
import { Badge, Button, colors, Empty, Field, Icon, Notice, ProductTile, RequestCard, s } from './ui';

type Action = 'APPROVE' | 'DECLINE';
type Decide = (id: number, action: Action, reason?: string) => void;

function FirstInQueue({ request, lots, disabled, onDecide }: {
  request: PantryRequest; lots: Map<number, Item>; disabled: boolean; onDecide: Decide;
}) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  return <Reveal event={request.id}><View style={s.card}>
    <View style={s.rowBetween}><Text style={s.tag}>First in line</Text><Badge text={request.status} /></View>
    <Text style={s.subtitle}>{request.displayName} · #{request.id}</Text>
    <Text style={s.small}>{new Date(request.submittedAt).toLocaleString()} · {units(request.totalUnits)} requested</Text>
    {request.lines.map(line => {
      const lot = lots.get(line.itemId);
      return <View key={line.itemId} style={styles.item}>
        {lot && <ProductTile item={lot} />}
        <View style={[s.grow, s.tight]}><Text style={s.emphasis}>{line.name}</Text>
          <Text style={s.small}>Lot #{line.itemId} · {units(line.quantity)} requested</Text>
          {lot ? <Badge text={lot.availability} quantity={lot.quantity} /> : <Text style={s.small}>Lot unavailable</Text>}
        </View>
      </View>;
    })}
    {declining ? <>
      <Field label="Reason for declining" value={reason} onChangeText={setReason} maxLength={500} multiline autoFocus />
      <Button title="Confirm decline" danger disabled={disabled || !reason.trim()} onPress={() => onDecide(request.id, 'DECLINE', reason.trim())} />
      <Button title="Cancel" secondary disabled={disabled} onPress={() => setDeclining(false)} />
    </> : <>
      <Text style={s.small}>Approval rechecks stock and this member’s weekly allowance.</Text>
      <View style={styles.actions}><View style={styles.action}><Button title="Approve request" icon="check-circle-outline" disabled={disabled} onPress={() => onDecide(request.id, 'APPROVE')} /></View>
        <View style={styles.action}><Button title="Decline…" danger icon="block" disabled={disabled} onPress={() => setDeclining(true)} /></View></View>
    </>}
  </View></Reveal>;
}

export function AdminQueue({ requests, items, busy, ready, onDecide }: {
  requests: PantryRequest[]; items: Item[]; busy: boolean; ready: boolean; onDecide: Decide;
}) {
  const [filter, setFilter] = useState<PantryRequest['status']>('PENDING');
  const pending = requests.filter(row => row.status === 'PENDING');
  const approved = requests.filter(row => row.status === 'APPROVED');
  const declined = requests.filter(row => row.status === 'DECLINED');
  const [next, ...waiting] = pending;
  const lots = new Map(items.map(item => [item.itemId, item]));
  return <View style={s.stack}>
    <View style={styles.summary}><View style={s.rowBetween}><Text style={s.subtitle}>Incoming queue</Text>
      <View style={s.inline}><Icon name="sort" size={16} /><Text style={s.small}>FIFO · oldest first</Text></View></View>
      <View style={styles.stats}>{([['PENDING', 'Pending', pending], ['APPROVED', 'Approved', approved], ['DECLINED', 'Declined', declined]] as const).map(([status, label, rows]) => {
        const active = filter === status;
        return <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Show ${label.toLowerCase()} requests`}
          onPress={() => setFilter(status)} style={[styles.stat, active && s.solid]}>
          <Text style={[s.subtitle, active && styles.white]}>{ready ? rows.length : '–'}</Text>
          <Text style={[s.small, active && styles.white]}>{label}</Text>
        </Pressable>;
      })}</View>
    </View>
    {!ready ? null : filter === 'PENDING' ? <>
      {next ? <FirstInQueue key={next.id} request={next} lots={lots} disabled={busy} onDecide={onDecide} />
        : <Empty title="Queue is clear" detail="Incoming requests appear here in the order they were submitted." />}
      {waiting.map((row, i) => <View key={row.id} style={s.card}>
        <View style={s.rowBetween}><Text style={s.subtitle}>{row.displayName} · #{row.id}</Text><Icon name="lock-outline" size={18} /></View>
        <Text style={s.small}>Position {i + 2} · {units(row.totalUnits)} requested</Text>
      </View>)}
    </> : (filter === 'APPROVED' ? approved : declined).length
      ? (filter === 'APPROVED' ? approved : declined).slice().reverse().map(row => <RequestCard key={row.id} request={row} />)
      : <Notice text={`No ${filter.toLowerCase()} requests yet.`} />}
  </View>;
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.mint, padding: 12, gap: 10, borderRadius: 8 },
  stats: { flexDirection: 'row', gap: 5 },
  stat: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, padding: 5, borderRadius: 5 },
  white: { color: colors.white },
  item: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, action: { flexGrow: 1, flexBasis: 110 },
});
