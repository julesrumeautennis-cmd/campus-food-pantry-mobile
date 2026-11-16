import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveApiBase } from '../src/api-base.ts';

test('web previews call their own origin without a hardcoded production URL', () => {
  for (const value of [undefined, '', '   ']) {
    assert.equal(resolveApiBase(value, 'web') + '/api/v1/items', '/api/v1/items');
  }
});
test('iOS and Android require an absolute configured server', () => {
  for (const platform of ['ios', 'android']) {
    assert.equal(resolveApiBase(undefined, platform), undefined);
    assert.equal(resolveApiBase('/api', platform), undefined);
    assert.equal(resolveApiBase('https://pantry.example///', platform), 'https://pantry.example');
    assert.equal(resolveApiBase('http://192.168.1.5:8080', platform), 'http://192.168.1.5:8080');
  }
});
test('invalid or credential-bearing addresses cannot receive bearer tokens', () => {
  for (const value of ['not-a-url', 'javascript:alert(1)', 'https://user:password@pantry.example', 'https://pantry.example?key=1', 'https://pantry.example#secret']) {
    assert.equal(resolveApiBase(value, 'web'), undefined);
  }
});
