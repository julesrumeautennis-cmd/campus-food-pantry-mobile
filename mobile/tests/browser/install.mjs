import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright-core';

const web = 'http://127.0.0.1:4187';

test('the exported web app offers a standalone launch and usable phone icons', async t => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(web);

  const session = await page.context().newCDPSession(page);
  const { url, data, errors } = await session.send('Page.getAppManifest');
  assert.equal(url, web + '/manifest.json');
  assert.deepEqual(errors, []);
  const manifest = JSON.parse(data);
  assert.equal(manifest.name, 'Campus Food Pantry');
  assert.equal(manifest.short_name, 'Pantry');
  assert.equal(manifest.display, 'standalone');
  assert.equal(new URL(manifest.start_url, url).href, web + '/');
  assert.equal(new URL(manifest.scope, url).href, web + '/');
  assert.equal(new URL(manifest.id, url).href, web + '/');

  for (const [size, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable']]) {
    assert.ok(manifest.icons.some(icon => icon.sizes === size && (icon.purpose || 'any') === purpose),
      `Missing ${size} ${purpose} launcher icon`);
  }
  const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  assert.ok(appleIcon);
  const icons = [...manifest.icons, { src: appleIcon, sizes: '180x180' }];
  for (const icon of icons) {
    const src = new URL(icon.src, url);
    assert.equal(src.origin, web);
    const size = await page.evaluate(async href => {
      const image = new Image();
      image.src = href;
      await image.decode();
      return `${image.naturalWidth}x${image.naturalHeight}`;
    }, src.href);
    assert.equal(size, icon.sizes, icon.src);
  }
});
