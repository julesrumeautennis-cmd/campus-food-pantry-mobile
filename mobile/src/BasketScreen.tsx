import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { basketUnits, lineLimit, requestLines, units } from './basket';
import type { Cart, Item, Me, PantryRequest } from './types';
import { Badge, Button, colors, Empty, Heading, Icon, IconButton, Notice, ProductTile, Quota, RequestCard, s, Stepper } from './ui';

export function Basket({ me, cart, items, review, valid, onChange, onClear }: {
  me: Me; cart: Cart; items: Map<number, Item>; review: boolean; valid: boolean;
  onChange: (id: number, quantity: number) => void; onClear: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const lines = requestLines(cart);
  const total = basketUnits(cart);
  return <View style={s.stack}>
    <View style={s.rowBetween}>
      <View style={s.inline}><Icon name={review ? 'fact-check' : 'shopping-bag'} /><Text accessibilityRole="header" style={s.title}>{review ? 'Review request' : 'Your basket'}</Text></View>
      {!review && lines.length > 0 && <Button secondary title="Clear all" onPress={() => setConfirmClear(true)} />}
    </View>
    {confirmClear && <View style={s.card}><Text style={s.subtitle}>Remove every item from this basket?</Text>
      <View style={s.rowBetween}><Button title="Keep items" secondary onPress={() => setConfirmClear(false)} />
        <Button title="Clear basket" danger onPress={() => { onClear(); setConfirmClear(false); }} /></View></View>}
    <Quota me={me} selected={total} />
    {!lines.length ? <Empty title="Your basket is empty" detail="Choose an item from the shelves to start a request." /> : <>
      <View style={s.shelf}>
        <View style={styles.section}><Text style={s.emphasis}>{review ? 'Requested items' : 'Selected items'} ({lines.length})</Text></View>
        {lines.map(({ itemId, quantity }) => {
          const item = items.get(itemId);
          return <View key={itemId} style={styles.line}>
            <View style={s.row}>{item && <ProductTile item={item} />}
              <View style={[s.grow, s.tight]}><Text style={s.subtitle}>{item?.name ?? 'Unavailable lot'}</Text>
                <Text style={s.small}>Lot #{itemId}{item && ` · ${item.category}`}</Text>
                {item && <Badge text={item.availability} quantity={item.quantity} />}</View>
              {review && <Text style={s.emphasis}>× {quantity}</Text>}
            </View>
            {!review && <View style={s.rowBetween}><IconButton name="delete-outline" label={`Remove lot ${itemId} from basket`} onPress={() => onChange(itemId, 0)} />
              {item && <Stepper name={item.name} value={quantity} max={lineLimit(cart, item, me.remainingUnits)} onChange={value => onChange(itemId, value)} />}</View>}
          </View>;
        })}
      </View>
      <View style={s.card}><View style={s.rowBetween}><Text style={s.subtitle}>Total units requested</Text><Text style={s.title}>{total}</Text></View>
        <Text style={s.small}>If approved, this request uses {units(total)} of your weekly allowance.</Text></View>
      {!valid && <Notice error text="Stock or your allowance has changed. Edit your basket before submitting." />}
      {review && <Notice text="Submitting sends your request to the pantry team. Stock and weekly allowance are deducted only at approval." />}
    </>}
  </View>;
}

export function SubmissionResult({ request, me }: { request: PantryRequest; me: Me }) {
  const pending = request.status === 'PENDING';
  return <View style={s.stack}>
    <View style={styles.confirmation}><View style={styles.stamp}><Icon name="check" color={colors.white} size={32} /></View>
      <Heading title={pending ? 'Request submitted' : 'Request received'} description={pending ? 'The Roosevelt pantry team will review your request in arrival order.' : 'The pantry team has already recorded a decision for this request.'} />
    </View>
    <RequestCard request={request} />
    {pending && <Notice text="Your request is pending. Your stock selection and weekly allowance have not been deducted." />}
    <Quota me={me} />
  </View>;
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.mint },
  line: { padding: 12, borderTopWidth: 1, borderTopColor: colors.line, gap: 9 },
  confirmation: { gap: 12, paddingVertical: 14 }, stamp: { borderRadius: 26, width: 50, height: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest },
});
