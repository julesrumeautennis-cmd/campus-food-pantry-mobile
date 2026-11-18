// The Expo bundle uses the normal Supabase client. Only password exchange and signing keys are fixtures.
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium, devices, webkit } from 'playwright-core';
import example from '../../../backend/src/test/resources/contracts/request.json' with { type: 'json' };

const web = 'http://127.0.0.1:4187';
const auth = 'http://127.0.0.1:4188';
const api = 'http://127.0.0.1:4189/api/v1';
const captures = fileURLToPath(new URL('../../../.local/stitch-ui/', import.meta.url));
const memberId = example.pending.userId;
const adminId = '30000000-0000-4000-8000-000000000003';

function makeIssuer() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = { ...publicKey.export({ format: 'jwk' }), use: 'sig', alg: 'RS256', kid: 'isolated-test' };
  const server = createServer((req, res) => {
    if (req.url !== '/auth/v1/.well-known/jwks.json') { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ keys: [key] }));
  });
  function session(id, email) {
    const user = { id, email, aud: 'authenticated', role: 'authenticated', user_metadata: { display_name: id === adminId ? 'Pantry staff' : 'Alex' },
      app_metadata: { provider: 'email', providers: ['email'] }, created_at: new Date().toISOString() };
    const now = Math.floor(Date.now() / 1000);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const payload = encode({ ...user, iss: auth + '/auth/v1', sub: id, exp: now + 3600, iat: now });
    const message = encode({ alg: 'RS256', kid: key.kid, typ: 'JWT' }) + '.' + payload;
    return { user, expires_in: 3600, token_type: 'bearer', refresh_token: 'unused-test-refresh',
      access_token: message + '.' + sign('RSA-SHA256', Buffer.from(message), privateKey).toString('base64url') };
  }
  return { server, session };
}

test('member and staff complete the Stitch flow through Java and PostgreSQL', { timeout: 150_000 }, async t => {
  const { server, session } = makeIssuer();
  server.listen(4188, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, headless: true });
  t.after(() => browser.close());
  await mkdir(captures, { recursive: true });
  const jsErrors = [];
  const external = [];
  async function signIn(id, email, reducedMotion, engine = browser, device = {}) {
    const context = await engine.newContext({ viewport: { width: 390, height: 844 }, reducedMotion, hasTouch: true, ...device });
    const page = await context.newPage();
    page.setDefaultTimeout(12_000);
    page.on('pageerror', error => jsErrors.push(error.message));
    const credentials = session(id, email);
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === auth && url.pathname === '/auth/v1/token' && route.request().method() === 'POST') {
        assert.equal(route.request().postDataJSON().email, email);
        await route.fulfill({ json: credentials, headers: { 'Access-Control-Allow-Origin': web } });
      } else if ([web, auth, new URL(api).origin].includes(url.origin)) await route.continue();
      else { external.push(url.origin); await route.abort(); }
    });
    await page.goto(web);
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('isolated-test-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('tab', { name: 'Browse' }).waitFor();
    return { page, token: credentials.access_token };
  }
  async function read(path, token) {
    const result = await fetch(api + path, { headers: { Authorization: 'Bearer ' + token } });
    assert.equal(result.status, 200, path);
    return result.json();
  }
  async function snapshot(page, name) {
    await page.evaluate(() => document.fonts.ready);
    // RN Web starts the entry animation in an effect after the new screen mounts.
    // Require a settled frame interval so screenshots cannot catch its initial paint.
    await page.getByTestId('screen-content').evaluate(node => new Promise(resolve => {
      let steadySince = performance.now();
      function sample(now) {
        if (Number(getComputedStyle(node).opacity) < 1) steadySince = now;
        if (now - steadySince >= 220) resolve();
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), name + ' overflows viewport');
    const bar = await page.getByRole('tablist').boundingBox();
    const viewport = page.viewportSize();
    assert.ok(bar && bar.x >= 10 && bar.x + bar.width <= viewport.width - 10 && bar.y + bar.height <= viewport.height - 8, name + ' needs an inset dock');
    const glass = await page.getByRole('tablist').evaluate(node => getComputedStyle(node).backdropFilter || getComputedStyle(node).webkitBackdropFilter);
    assert.ok(glass.includes('blur'), name + ' needs a glass backdrop');
    await page.screenshot({ path: join(captures, name + '.png'), animations: 'disabled' });
  }
  const member = await signIn(memberId, 'member@example.test', 'no-preference');
  const { page } = member;
  const click = label => page.getByRole('button', { name: label, exact: true }).click();
  const text = value => page.getByText(value, { exact: true });
  const quota = count => page.getByText((5 - count) + ' units left', { exact: true }).first();

  assert.equal(await page.getByRole('tab', { name: 'Admin' }).count(), 0);
  assert.equal((await fetch(api + '/admin/requests', { headers: { Authorization: 'Bearer ' + member.token } })).status, 403);
  await quota(0).waitFor();
  // An unavailable personal history must not prevent browsing, opening the basket or retrying.
  let historyReads = 0;
  await page.route(api + '/requests/mine', async route => {
    historyReads++;
    await route.fulfill({ status: 503, json: { code: 'SERVICE_BUSY', message: 'Please retry.' },
      headers: { 'Access-Control-Allow-Origin': web } });
  });
  await page.getByRole('tab', { name: 'Requests' }).click();
  await page.getByRole('alert').filter({ hasText: 'request history' }).waitFor();
  await page.getByRole('button', { name: 'View basket, 0 units' }).click();
  await page.getByText('Your basket is empty').waitFor();
  await page.getByRole('tab', { name: 'Browse' }).click();
  await page.getByRole('button', { name: /^View Rice, lot 101/ }).waitFor();
  assert.equal(await page.getByRole('alert').count(), 0);
  assert.equal(historyReads, 1);
  await page.unroute(api + '/requests/mine');
  await snapshot(page, '01-browse');
  assert.ok(await page.getByRole('button', { name: 'Add one Rolled Oats to basket' }).isDisabled());
  await page.getByRole('button', { name: /^Hygiene, / }).click();
  assert.equal(await page.getByRole('button', { name: /^View Rice,/ }).count(), 0);
  await page.getByRole('button', { name: /^All items,/ }).click();
  await page.getByRole('button', { name: 'Sort by name' }).click();
  await page.getByLabel('Search by name or lot ID').fill('#101');
  await page.getByRole('button', { name: /^View Rice, lot 101/ }).click();
  await click('Add one Rice');
  const hero = await page.getByTestId('product-hero').boundingBox();
  assert.ok(hero && hero.height > 170 && Math.abs(hero.width / hero.height - 1.65) < 0.05, 'detail photograph keeps its aspect ratio');
  await snapshot(page, '02-lot-detail');
  await click('Add 2 units to basket');
  await text('2 units in basket').waitFor();
  await page.getByRole('button', { name: /^View basket,/ }).click();
  await text('Total').waitFor();
  await snapshot(page, '03-basket');
  await click('Review request');
  await snapshot(page, '04-review');

  // Drop the first response after the server has committed, then retry the identical basket.
  const submissions = [];
  page.on('request', req => { if (req.url() === api + '/requests' && req.method() === 'POST') submissions.push(req.postDataJSON()); });
  let dropped = false;
  await page.route(api + '/requests', async route => {
    if (!dropped && route.request().method() === 'POST') {
      dropped = true;
      assert.equal((await route.fetch()).status(), 200);
      await route.abort('failed');
    } else await route.continue();
  });
  await click('Submit request (2 units)');
  await page.getByText(/Could not reach the pantry service/).waitFor();
  await click('Submit request (2 units)');
  await text('Request submitted').waitFor();
  assert.equal(submissions.length, 2);
  assert.deepEqual(submissions[0], submissions[1]);
  assert.deepEqual(submissions[0].lines, example.submit.lines);
  const [first] = await read('/requests/mine', member.token);
  assert.equal((await read('/requests/mine', member.token)).length, 1);
  assert.equal(first.status, example.pending.status);
  assert.equal((await read('/items/101', member.token)).quantity, 20);
  assert.equal((await read('/me', member.token)).approvedUnits, 0);
  await quota(0).waitFor();
  await snapshot(page, '05-submitted');
  await click('View my requests');
  await text('Pending').waitFor();
  await page.getByRole('tab', { name: 'Browse' }).click();
  await click('Clear search');
  await click('Add one Toothpaste to basket');
  await page.getByTestId('cart-flight').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: /^View basket,/ }).click(); await click('Review request'); await click('Submit request (1 unit)');
  await text('Request submitted').waitFor(); await click('View my requests');

  const { page: staff } = await signIn(adminId, 'staff@example.test', 'reduce');
  await staff.getByRole('tab', { name: 'Profile' }).click();
  await staff.getByRole('button', { name: 'Student ID' }).click();
  await staff.getByText(adminId, { exact: true }).waitFor();
  await staff.getByRole('button', { name: 'Request history' }).click();
  await staff.getByText('No requests yet', { exact: true }).waitFor();
  await staff.getByRole('tab', { name: 'Admin' }).click();
  await staff.getByText('First in line', { exact: true }).waitFor();
  assert.equal(await staff.getByRole('tab', { name: 'Profile' }).count(), 1);
  for (const section of ['Inventory', 'Reports', 'Inspections', 'Incoming requests']) {
    await staff.getByRole('button', { name: /^Admin sections,/ }).click();
    await staff.getByRole('button', { name: section, exact: true }).click();
    await staff.getByRole('button', { name: 'Admin sections, ' + section }).waitFor();
  }
  await staff.getByText('First in line', { exact: true }).waitFor();
  assert.equal(await staff.getByRole('button', { name: 'Approve request' }).count(), 1);
  await snapshot(staff, '06-admin-queue');
  await staff.getByRole('button', { name: 'Approve request' }).click();
  await staff.getByText(`Request #${first.id} was approved.`, { exact: true }).waitFor();
  await staff.getByRole('button', { name: 'Decline…' }).click();
  await staff.getByLabel('Reason for declining').fill('Lot set aside for inspection.');
  await staff.getByRole('button', { name: 'Confirm decline' }).click();
  await staff.getByText('Queue is clear').waitFor();

  await click('Refresh status');
  await text('Approved').waitFor();
  await text('Declined').waitFor();
  await text('Lot set aside for inspection.').waitFor();
  await snapshot(page, '07-history');
  assert.equal((await read('/items/101', member.token)).quantity, 18);
  assert.equal((await read('/items/203', member.token)).quantity, 2);
  assert.equal((await read('/me', member.token)).remainingUnits, 3);
  await page.getByRole('tab', { name: 'Profile' }).click();
  await quota(2).waitFor();
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('tab', { name: 'Browse' }).click();
  await page.getByRole('button', { name: /^View Rice, lot 101/ }).waitFor();
  await snapshot(page, '08-narrow-browse');
  for (const width of [375, 430]) {
    await page.setViewportSize({ width, height: 852 });
    await snapshot(page, 'browse-' + width);
  }
  if (process.env.PANTRY_TEST_WEBKIT === '1') {
    const safari = await webkit.launch();
    t.after(() => safari.close());
    const { page: phone } = await signIn(memberId, 'member@example.test', 'no-preference', safari, devices['iPhone 13']);
    await phone.getByRole('button', { name: /^View Rice, lot 101/ }).waitFor();
    assert.equal(await phone.getByRole('tab', { name: 'Admin' }).count(), 0);
    await snapshot(phone, 'iphone-webkit-browse');
    await phone.getByRole('button', { name: 'View basket, 0 units' }).tap();
    await phone.getByText('Your basket is empty').waitFor();
    await phone.getByRole('tab', { name: 'Profile' }).tap();
    await phone.getByRole('button', { name: 'Student ID' }).tap();
    await phone.getByText(memberId, { exact: true }).waitFor();
    await snapshot(phone, 'iphone-webkit-profile');
  }
  assert.deepEqual(jsErrors, []);
  assert.deepEqual(external, []);
});
