/* eslint-disable indent, max-len, quotes, object-curly-spacing */
/**
 * Compose 1–4 atom plate images onto a single canvas with overlap and a
 * subtle drop shadow.
 *
 * Plate cut-out uses `assets/full-plate-mask.png` (a black circle on
 * transparent background, alpha 255 inside the plate, 0 outside). The
 * shadow is derived per-plate from the masked alpha channel, dyed black,
 * blurred, alpha-scaled, and composited under the plate with a small
 * Y offset to suggest a slight elevation.
 *
 * Layouts can be overridden via `opts.layout`; otherwise the defaults
 * below are used. The composite-tuner webapp uses overrides to dial in
 * the right values.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const CANVAS = 1024;
// Canvas background is transparent so the composite drops in cleanly on
// whatever surface the PWA renders it on (card, drawer, modal). Plates +
// shadow keep their own alpha.
const BG = { r: 255, g: 255, b: 255, alpha: 0 };
const MASK_PATH = path.join(__dirname, '..', 'assets', 'full-plate-mask.png');
let _maskBuffer = null;
function getMask() {
  if (!_maskBuffer) _maskBuffer = fs.readFileSync(MASK_PATH);
  return _maskBuffer;
}

// Tweakable defaults. The tuner is the source of truth for these — once
// you're happy with the numbers there, paste them in here.
const DEFAULT_SHADOW = { blur: 12, opacity: 0.20, yOffset: 7 };

const DEFAULT_LAYOUTS = {
  1: [
    { x: 512, y: 512, size: 980 },
  ],
  2: [
    { x: 640, y: 460, size: 720 },  // right (back)
    { x: 400, y: 590, size: 720 },  // left (front)
  ],
  3: [
    { x: 720, y: 600, size: 600 },  // right (back)
    { x: 530, y: 350, size: 600 },  // top
    { x: 340, y: 680, size: 600 },  // bottom-left (front)
  ],
  4: [
    { x: 720, y: 360, size: 540 },  // top right (back)
    { x: 320, y: 360, size: 540 },  // top left
    { x: 700, y: 700, size: 540 },  // bottom right
    { x: 340, y: 700, size: 540 },  // bottom left (front)
  ],
};

async function maskRound(buf, targetSize) {
  // Resize the input to targetSize and mask with the PNG plate cut-out.
  const mask = await sharp(getMask())
    .resize(targetSize, targetSize, { fit: 'fill' })
    .toBuffer();
  const resized = await sharp(buf)
    .resize(targetSize, targetSize, { fit: 'cover' })
    .ensureAlpha()
    .toBuffer();
  return await sharp(resized)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function makeShadow(plateBuf, { blur, opacity }) {
  // Derive the shadow from the plate's own alpha channel so the silhouette
  // matches the mask shape exactly. RGB → black, alpha → alpha * opacity.
  const meta = await sharp(plateBuf).metadata();
  const alpha = await sharp(plateBuf).extractChannel('alpha').raw().toBuffer();
  const rgba = Buffer.alloc(meta.width * meta.height * 4);
  for (let i = 0; i < alpha.length; i++) {
    rgba[i * 4 + 0] = 0;
    rgba[i * 4 + 1] = 0;
    rgba[i * 4 + 2] = 0;
    rgba[i * 4 + 3] = Math.round(alpha[i] * opacity);
  }
  return await sharp(rgba, { raw: { width: meta.width, height: meta.height, channels: 4 } })
    .blur(blur)
    .png()
    .toBuffer();
}

/**
 * @param {Buffer[]} atomBuffers — 1..4 atom plate images (in draw order: back → front)
 * @param {object} [opts]
 * @param {Array<{x:number,y:number,size:number}>} [opts.layout]
 * @param {{blur:number,opacity:number,yOffset:number}|null} [opts.shadow]
 * @returns {Promise<Buffer>} composited PNG buffer (CANVAS×CANVAS)
 */
async function compositeAtoms(atomBuffers, opts = {}) {
  if (!atomBuffers || atomBuffers.length === 0) {
    throw new Error('compositeAtoms: no buffers');
  }
  const N = Math.min(atomBuffers.length, 4);
  // Single-plate goes through the same mask + shadow path as multi so the
  // visual treatment (round cut-out, subtle shadow) is consistent.
  const layout = opts.layout || DEFAULT_LAYOUTS[N];
  const shadow = opts.shadow === null ? null : { ...DEFAULT_SHADOW, ...(opts.shadow || {}) };

  // Mask each atom to its slot size.
  const masked = await Promise.all(
    atomBuffers.slice(0, N).map((b, i) => maskRound(b, layout[i].size))
  );

  // Build overlay list: for each plate, optional shadow first, then plate.
  const overlays = [];
  for (let i = 0; i < N; i++) {
    const { x, y, size } = layout[i];
    const left = Math.round(x - size / 2);
    const top  = Math.round(y - size / 2);
    if (shadow) {
      const sh = await makeShadow(masked[i], shadow);
      overlays.push({ input: sh, left, top: top + shadow.yOffset });
    }
    overlays.push({ input: masked[i], left, top });
  }

  return await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: BG },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

module.exports = { compositeAtoms, DEFAULT_LAYOUTS, DEFAULT_SHADOW, CANVAS };
