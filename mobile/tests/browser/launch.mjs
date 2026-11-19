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
      ? { dir: captures, size: devices['iPhone 13'].viewport } : undefined;
    const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion, recordVideo });
    const page = await context.newPage();
    try {
      await page.addInitScript(() => {
        const tracks = window.launchTracks = [];
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (...args) {
          const animation = animate.apply(this, args);
          const id = this.getAttribute('data-testid');
          if (id !== 'launch-aperture' && id !== 'launch-cover') return animation;
          const duration = Number(animation.effect.getTiming().duration);
          const times = id === 'launch-aperture' ? [0, 0.15, 0.49, 0.94] : [0, 0.5, 1];
          const track = { id, duration, values: [], finished: false };
          tracks.push(track);
          // Seek before the browser paints, then play the complete transition for the recording.
          // Busy WebKit runners can deliver only a few animation-frame callbacks during launch.
          animation.pause();
          for (const time of times) {
            animation.currentTime = duration * time;
            const style = getComputedStyle(this);
            if (id === 'launch-cover') track.values.push(Number(style.opacity));
            else track.values.push(style.transform === 'none' ? 1 : new DOMMatrixReadOnly(style.transform).a);
          }
          animation.currentTime = 0;
          animation.play();
          animation.finished.then(() => { track.finished = true; }, () => {});
          return animation;
        };
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
      const tracks = await page.evaluate(() => window.launchTracks);
      if (reducedMotion === 'reduce') {
        assert.ok(!tracks.some(track => track.id === 'launch-aperture'), 'Reduce Motion must keep the basket still');
        const fade = tracks.find(track => track.id === 'launch-cover' && track.finished);
        assert.ok(fade, 'The short crossfade must finish');
        assert.ok(fade.duration <= 200 && fade.values[0] === 1 && fade.values[2] === 0);
        assert.ok(Math.abs(fade.values[1] - 0.5) < 0.02);
      } else {
        const opening = tracks.find(track => track.id === 'launch-aperture' && track.finished);
        assert.ok(opening, 'The opening must finish on a fast session restore');
        const [rest, pinch, reveal, full] = opening.values;
        assert.ok(Math.abs(rest - 1) < 0.01 && Math.abs(pinch - 0.8) < 0.02, JSON.stringify(opening));
        assert.ok(Math.abs(reveal - 4) < 0.1 && full > 10, JSON.stringify(opening));
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
