import assert from 'node:assert/strict';
import test from 'node:test';
import { basketUnits, lineLimit, requestLines, setQuantity, validBasket } from '../src/basket.ts';
import { pending } from './request-contract.ts';

const me = { weeklyLimit: 5, approvedUnits: 1, remainingUnits: 4 };
const rice = { itemId: 101, availability: 'IN_STOCK', quantity: 20 };
const milk = { itemId: 105, availability: 'LOW_STOCK', quantity: 2 };

test('basket is constrained by available stock and approved quota across lots', () => {
  const cart = { 101: pending.totalUnits, 105: 1 };
  assert.equal(lineLimit(cart, rice, me.remainingUnits), 3);
  assert.equal(lineLimit(cart, milk, me.remainingUnits), 2);
  assert.equal(validBasket(cart, new Map([[101, rice], [105, milk]]), me), true);
  assert.equal(basketUnits(cart), 3);
  assert.deepEqual(requestLines(cart), [{ itemId: 101, quantity: 2 }, { itemId: 105, quantity: 1 }]);
  assert.equal(me.approvedUnits, 1);
});

test('withdrawn, expired, over-quota and reduced-stock selections cannot submit and can be removed', () => {
  const cart = { 101: 2 };
  for (const item of [{ ...rice, availability: 'EXPIRED' }, { ...rice, availability: 'OUT_OF_STOCK' }, { ...rice, quantity: 1 }]) {
    assert.equal(validBasket(cart, new Map([[101, item]]), me), false);
  }
  assert.equal(validBasket(cart, new Map(), me), false);
  assert.equal(validBasket(cart, new Map([[101, rice]]), { ...me, remainingUnits: 1 }), false);
  assert.deepEqual(setQuantity(cart, 101, 0), {});
  assert.deepEqual(cart, { 101: 2 });
});
