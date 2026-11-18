import type { Cart, Item, Me } from './types';

export function units(count: number) {
  return `${count} ${count === 1 ? 'unit' : 'units'}`;
}

export function basketUnits(cart: Cart) {
  return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
}

export function lineLimit(cart: Cart, item: Item, remaining: number) {
  if (item.availability === 'EXPIRED' || item.availability === 'OUT_OF_STOCK') return 0;
  const otherUnits = basketUnits(cart) - (cart[item.itemId] ?? 0);
  return Math.max(0, Math.min(item.quantity, remaining - otherUnits));
}

export function setQuantity(cart: Cart, id: number, quantity: number) {
  const next = { ...cart };
  if (quantity > 0) next[id] = quantity;
  else delete next[id];
  return next;
}

export function requestLines(cart: Cart) {
  return Object.entries(cart).map(([id, quantity]) => ({ itemId: Number(id), quantity }))
    .sort((a, b) => a.itemId - b.itemId);
}

export function validBasket(cart: Cart, items: Map<number, Item>, me: Me) {
  const total = basketUnits(cart);
  return total > 0 && total <= me.remainingUnits && requestLines(cart).every(({ itemId, quantity }) => {
    const item = items.get(itemId);
    return item && Number.isInteger(quantity) && quantity > 0 && quantity <= lineLimit(cart, item, me.remainingUnits);
  });
}
