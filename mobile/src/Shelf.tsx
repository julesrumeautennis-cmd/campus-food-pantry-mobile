import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from './api';
import { lineLimit, units } from './basket';
import { Reveal } from './motion';
import type { Cart, Item, Me } from './types';
import { Badge, Button, colors, Empty, Icon, IconButton, Notice, ProductTile, Quota, s, Stepper } from './ui';

export type Filters = { search: string; category: '' | Item['category']; sort: 'id' | 'name' };
export const defaultFilters: Filters = { search: '', category: '', sort: 'id' };

function useShelf(items: Item[], { search, category, sort }: Filters) {
  const query = search.trim();
  const lot = /^(?:#|lot\s*#?)?(\d+)$/i.exec(query)?.[1];
  const local = Boolean(lot) || (!query && sort === 'id');
  const path = `/items?search=${encodeURIComponent(query)}&category=${category}&sort=${sort}`;
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ path: string; rows: Item[]; error?: string } | null>(null);
  useEffect(() => {
    if (local) return;
    const control = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const rows = await api<Item[]>(path, 'GET', undefined, control.signal);
        if (!control.signal.aborted) setResult({ path, rows });
      } catch (e) {
        if (!control.signal.aborted) setResult({ path, rows: [], error: e instanceof Error ? e.message : 'Search failed.' });
      }
    }, 150);
    return () => { clearTimeout(timer); control.abort(); };
  }, [local, path, items, retry]);

  const rows = local ? items.filter(item => (!category || item.category === category) && (!lot || item.itemId === Number(lot)))
    : result?.path === path ? result.rows : [];
  return {
    rows, loading: !local && result?.path !== path, error: !local && result?.path === path ? result.error : undefined,
    retry: () => { setResult(null); setRetry(value => value + 1); },
  };
}

export function Shelf({ items, me, cart, filters, onFilter, onOpen, onAdd, onRefresh }: {
  items: Item[]; me: Me; cart: Cart; filters: Filters; onFilter: (filters: Filters) => void;
  onOpen: (id: number) => void; onAdd: (item: Item, source: React.ComponentRef<typeof View> | null) => void; onRefresh: () => void;
}) {
  const { rows, loading, error, retry } = useShelf(items, filters);
  return <View style={s.stack}>
    <Quota me={me} />
    <View style={styles.search}>
      <Icon name="search" /><TextInput accessibilityLabel="Search by name or lot ID" placeholder="Search by name or lot ID…"
        placeholderTextColor={colors.muted} style={styles.searchInput} value={filters.search} onChangeText={search => onFilter({ ...filters, search })}
        autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      {filters.search.length > 0 ? <IconButton name="close" label="Clear search" onPress={() => onFilter({ ...filters, search: '' })} />
        : <IconButton name="refresh" label="Refresh inventory" onPress={onRefresh} />}
    </View>
    <View style={styles.filters}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.grow} contentContainerStyle={styles.filterTrack} keyboardShouldPersistTaps="handled">
        {(['', 'Food', 'Hygiene'] as const).map(category => {
          const active = filters.category === category;
          const label = category || 'All items';
          const count = category ? items.filter(item => item.category === category).length : items.length;
          return <Pressable key={category} accessibilityRole="button" accessibilityLabel={`${label}, ${count} lots`}
            accessibilityState={{ selected: active }} onPress={() => onFilter({ ...filters, category })}
            style={[s.chip, styles.filter, active && s.chipActive]}>
            <Text style={[s.chipText, active && styles.white]}>{label} {count}</Text>
          </Pressable>;
        })}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel={`Sort by ${filters.sort === 'id' ? 'name' : 'lot ID'}`}
        onPress={() => onFilter({ ...filters, sort: filters.sort === 'id' ? 'name' : 'id' })} style={styles.sort}>
        <Icon name="sort" size={17} /><Text style={s.small}>{filters.sort === 'id' ? 'Lot ID' : 'A–Z'}</Text>
      </Pressable>
    </View>
    {loading ? <ActivityIndicator accessibilityLabel="Loading items" color={colors.green} />
      : error ? <><Notice text={error} error /><Button secondary title="Retry search" onPress={retry} /></>
      : !rows.length ? <Empty title="No items found" detail={items.length ? 'Try another name, lot ID or category.' : 'The pantry team has not added any lots yet.'} />
      : <View style={s.shelf}>{rows.map((item, index) => {
        const quantity = cart[item.itemId] ?? 0;
        const limit = lineLimit(cart, item, me.remainingUnits);
        const unavailable = item.availability === 'EXPIRED' || item.availability === 'OUT_OF_STOCK';
        return <View key={item.itemId} style={[styles.shelfRow, index > 0 && styles.divider]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.name}, lot ${item.itemId}, ${item.availability.toLowerCase().replaceAll('_', ' ')}`}
            onPress={() => onOpen(item.itemId)} style={({ pressed }) => [styles.product, pressed && s.pressed]}>
            <View style={unavailable && { opacity: 0.55 }}><ProductTile item={item} /></View>
            <View style={[s.grow, s.tight]}>
              <View style={styles.nameRow}><Text style={s.subtitle}>{item.name}</Text><Text style={styles.lot}>Lot #{item.itemId}</Text></View>
              <Text style={s.small}>{item.category} · 1 unit each</Text><Badge text={item.availability} quantity={item.quantity} />
            </View>
          </Pressable>
          <ShelfAdd item={item} quantity={quantity} disabled={quantity >= limit} unavailable={unavailable} onAdd={onAdd} />
        </View>;
      })}</View>}
  </View>;
}

function ShelfAdd({ item, quantity, disabled, unavailable, onAdd }: {
  item: Item; quantity: number; disabled: boolean; unavailable: boolean;
  onAdd: (item: Item, source: React.ComponentRef<typeof View> | null) => void;
}) {
  const source = useRef<React.ComponentRef<typeof View>>(null);
  return <Pressable ref={source} accessibilityRole="button" accessibilityLabel={`Add one ${item.name} to basket`}
    disabled={disabled} accessibilityState={{ disabled }} onPress={() => onAdd(item, source.current)}
    style={({ pressed }) => [s.iconButton, styles.add, disabled && styles.quiet, pressed && s.pressed]}>
    <Reveal event={quantity} count>{quantity > 0 ? <Text style={[styles.count, disabled && { color: colors.green }]}>{quantity}</Text>
      : <Icon name={unavailable ? 'block' : 'add'} color={disabled ? colors.muted : colors.white} />}</Reveal>
  </Pressable>;
}

export function Detail({ item, me, inBasket, availableToAdd, amount, onAmount }: {
  item: Item; me: Me; inBasket: number; availableToAdd: number; amount: number; onAmount: (n: number) => void;
}) {
  return <View style={s.stack}>
    <View style={s.card}>
      <View><ProductTile item={item} large /><View style={styles.heroTag}><Icon name={item.category === 'Food' ? 'eco' : 'soap'} size={14} />
        <Text style={s.emphasis}>{item.category === 'Food' ? 'Pantry staple' : 'Daily care'}</Text></View></View>
      <Text accessibilityRole="header" style={s.title}>{item.name}</Text>
      <Text style={s.body}>Lot #{item.itemId} · {item.category} · 1 unit each</Text>
      {item.expirationDate && <View style={s.inline}><Icon name="event" size={16} /><Text style={s.small}>Best before {item.expirationDate}</Text></View>}
    </View>
    <View style={[s.card, styles.tinted]}><Badge text={item.availability} quantity={item.quantity} />
      <Text style={s.small}>The pantry team checks the lot and your allowance again when it reviews your request.</Text></View>
    <Quota me={me} />
    <View style={s.card}><View style={s.rowBetween}><View><Text style={s.subtitle}>Select quantity</Text><Text style={s.small}>{units(inBasket)} already in basket</Text></View>
      <Stepper name={item.name} value={amount} min={availableToAdd ? 1 : 0} max={availableToAdd} onChange={onAmount} /></View>
      {availableToAdd === 0 && <Text style={s.small}>No more units can be added with the current stock and allowance.</Text>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 4, gap: 6, minHeight: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 7 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 46, fontSize: 16, color: colors.ink, fontFamily: 'Manrope' },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 6 }, filterTrack: { alignItems: 'center', gap: 5 },
  filter: { paddingHorizontal: 9 }, white: { color: colors.white },
  sort: { flexDirection: 'row', minHeight: 44, alignItems: 'center', gap: 2, paddingHorizontal: 3 },
  shelfRow: { padding: 11, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 88 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  product: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 5 },
  lot: { fontFamily: 'ManropeSemiBold', color: colors.muted, fontSize: 11 },
  add: { backgroundColor: colors.green, borderRadius: 12 }, quiet: { backgroundColor: colors.mint },
  count: { color: colors.white, fontFamily: 'ManropeBold', fontSize: 17, textAlign: 'center' },
  heroTag: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.white, borderRadius: 4, padding: 6 },
  tinted: { backgroundColor: colors.mint },
});
