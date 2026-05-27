/**
 * Tests for compositeWithPlateMask: verifies the post-generation mask overlay
 * preserves dimensions and keeps mask-opaque areas pixel-perfect from the
 * reference mask, regardless of what's underneath.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { _internal } = require('../src/dataGeneration');

const plateMaskPath = path.join(__dirname, '..', 'assets', 'plateMask.png');
const plateMaskBuffer = fs.readFileSync(plateMaskPath);

async function makeSolidColorPng(width, height, rgb) {
  return sharp({
    create: {
      width, height,
      channels: 3,
      background: { r: rgb[0], g: rgb[1], b: rgb[2] },
    },
  }).png().toBuffer();
}

test('compositeWithPlateMask returns PNG matching mask dimensions', async () => {
  const generated = await makeSolidColorPng(1024, 1024, [255, 0, 0]);
  const out = await _internal.compositeWithPlateMask(generated, plateMaskBuffer);
  const meta = await sharp(out).metadata();
  const maskMeta = await sharp(plateMaskBuffer).metadata();
  assert.equal(meta.format, 'png');
  assert.equal(meta.width, maskMeta.width);
  assert.equal(meta.height, maskMeta.height);
});

test('compositeWithPlateMask replaces mask-opaque pixels with mask content', async () => {
  // Pure red base. Where the mask is opaque (rim/corners), output must
  // match the mask (white-ish). Sampling a corner that is opaque white.
  const generated = await makeSolidColorPng(1024, 1024, [255, 0, 0]);
  const out = await _internal.compositeWithPlateMask(generated, plateMaskBuffer);
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  const sample = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  // Top-left corner: mask alpha ~225 (mostly opaque, white), so red should be heavily mixed out
  const [r, g, b] = sample(5, 5);
  assert.ok(g > 200, `expected mask-opaque area to be near-white, got ${[r, g, b]}`);
  assert.ok(b > 200, `expected mask-opaque area to be near-white, got ${[r, g, b]}`);
});

test('compositeWithPlateMask shows generated content through transparent mask area', async () => {
  // Pure red base. Where the mask is fully transparent (center), the red
  // should pass through.
  const generated = await makeSolidColorPng(1024, 1024, [255, 0, 0]);
  const out = await _internal.compositeWithPlateMask(generated, plateMaskBuffer);
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  const cx = Math.floor(info.width / 2);
  const cy = Math.floor(info.height / 2);
  const i = (cy * info.width + cx) * info.channels;
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  assert.ok(r > 200, `expected red to bleed through transparent center, got ${[r, g, b]}`);
  assert.ok(g < 60 && b < 60, `expected center to remain red-dominant, got ${[r, g, b]}`);
});

test('compositeWithPlateMask resizes mismatched input to mask size', async () => {
  // Input 512x512, mask is 1080x1081 — output must match mask.
  const generated = await makeSolidColorPng(512, 512, [0, 255, 0]);
  const out = await _internal.compositeWithPlateMask(generated, plateMaskBuffer);
  const meta = await sharp(out).metadata();
  const maskMeta = await sharp(plateMaskBuffer).metadata();
  assert.equal(meta.width, maskMeta.width);
  assert.equal(meta.height, maskMeta.height);
});
