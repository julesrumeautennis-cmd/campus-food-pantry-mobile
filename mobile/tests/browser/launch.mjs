import assert from 'node:assert/strict';
import { mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium, devices, webkit } from 'playwright-core';

const web = 'http://127.0.0.1:4187';
const captures = fileURLToPath(new URL('../../../.local/stitch-ui/', import.meta.url));

test('the cold launch hands its basket to sign-in and respects Reduce Motion', async t => {
  const ios = process.env.PANTRY_TEST_WEBKIT === '1';
  const browser = ios ? await webkit.launch() : await chromium.launch({ executablePath: process.env.CHROME_BIN });
  t.after(() => browser.close());
  await mkdir(captures, { recursive: true });
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const recordVideo = ios && reducedMotion === 'no-preference'
      ? { dir: captures, size: { width: 390, height: 844 } } : undefined;
    const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion, recordVideo });
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        const scales = window.launchScales = [];
        function sample() {
          const frame = document.querySelector('[data-testid="launch-aperture"]');
          if (frame) {
            const transform = getComputedStyle(frame).transform;
            scales.push(transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a);
          }
          if (frame || !scales.length) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
      let releaseBundle;
      const bundleGate = new Promise(resolve => { releaseBundle = resolve; });
      await page.route('**/_expo/static/js/web/*.js', async route => { await bundleGate; await route.continue(); });
      await page.goto(web, { waitUntil: 'commit' });
      await page.locator('#root:empty').waitFor({ state: 'attached' });
      const poster = await page.locator('#root').evaluate(async root => {
        const style = getComputedStyle(root);
        const image = new Image();
        image.src = '/launch/pantry-mark.png';
        await image.decode();
        return [style.backgroundImage, style.backgroundColor, image.naturalWidth];
      });
      assert.ok(poster[0].includes('pantry-mark.png'));
      assert.equal(poster[1], 'rgb(0, 53, 37)');
      assert.ok(poster[2] >= 336);
      releaseBundle();
      await page.getByRole('button', { name: 'Create an account' }).waitFor();
      await page.getByTestId('launch-cover').waitFor({ state: 'detached' });
      const scales = await page.evaluate(() => window.launchScales);
      assert.ok(scales.length, 'Launch must mount even when session restore is fast');
      if (reducedMotion === 'reduce') assert.ok(scales.every(scale => scale === 1), 'Reduce Motion must keep the basket still');
      else {
        assert.ok(Math.min(...scales) < 0.98, 'The basket anticipates the reveal');
        assert.ok(Math.max(...scales) > 10, 'The opening grows through the basket');
        await page.screenshot({ path: captures + 'launch-sign-in.png' });
      }
      await page.getByRole('button', { name: 'Create an account' }).click();
      assert.equal(await page.getByTestId('launch-cover').count(), 0);
    } finally {
      await context.close();
      const video = page.video();
      if (video) await rename(await video.path(), captures + 'iphone-launch.webm');
    }
  }
});
