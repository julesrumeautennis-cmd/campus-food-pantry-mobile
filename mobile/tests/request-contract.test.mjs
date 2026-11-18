import assert from 'node:assert/strict';
import test from 'node:test';
import { pending, submit } from './request-contract.ts';

test('the member can display the pending request for the submitted basket', () => {
  const requestedUnits = submit.lines.reduce((sum, line) => sum + line.quantity, 0);
  assert.equal(pending.totalUnits, requestedUnits);
  assert.deepEqual(pending.lines.map(({ itemId, quantity }) => ({ itemId, quantity })), submit.lines);
  assert.equal(pending.decidedAt, null);
  assert.equal(pending.decisionReason, null);
  assert.ok(Number.isFinite(Date.parse(pending.submittedAt)));
});
