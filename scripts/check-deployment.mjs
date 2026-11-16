// Checks a staged production deployment before assigning its public domains.
import assert from 'node:assert/strict';
const base = process.env.DEPLOYMENT_URL;
const url = new URL(base);
assert.equal(url.protocol, 'https:');
assert.equal(url.origin, base);
assert.ok(url.hostname.endsWith('.vercel.app'));
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = bypass ? { 'x-vercel-protection-bypass': bypass } : {};
for (const path of ['/', '/requests']) {
  const response = await fetch(new URL(path, base), { headers, redirect: 'error', signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200, `${path}: frontend is unavailable`);
  assert.match(response.headers.get('content-type') || '', /text\/html/);
}
const ready = await fetch(new URL('/health/ready', base), { headers, redirect: 'error', signal: AbortSignal.timeout(60000) });
assert.equal(ready.status, 200, 'Java API/database is not ready');
assert.deepEqual(await ready.json(), { status: 'ready' });
const unauthorized = await fetch(new URL('/api/v1/items', base), { headers, redirect: 'error', signal: AbortSignal.timeout(60000) });
assert.equal(unauthorized.status, 401, 'API routing/authentication failed');
assert.equal((await unauthorized.json()).code, 'UNAUTHENTICATED');
console.log('PASS: frontend, deep link, database readiness and protected API route.');
