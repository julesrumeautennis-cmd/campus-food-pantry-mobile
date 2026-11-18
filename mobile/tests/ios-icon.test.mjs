import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import config from '../app.json' with { type: 'json' };

test('the configured iOS launcher icon is an opaque 1024-pixel square PNG', async () => {
  const source = new URL(config.expo.ios.icon, new URL('../', import.meta.url));
  const png = await readFile(source);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.ok([0, 2, 3].includes(png[25]), 'the PNG must have no alpha channel');
  for (let offset = 8; offset < png.length; offset += 12 + png.readUInt32BE(offset)) {
    assert.notEqual(png.toString('ascii', offset + 4, offset + 8), 'tRNS', 'the PNG must be opaque');
  }
});
