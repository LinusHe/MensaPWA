/**
 * Dump the exact buffers we send to OpenAI images/edits so we can inspect
 * what the model actually sees as `image` and `mask`.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  const rawMask = fs.readFileSync(path.join(__dirname, 'assets', 'plateMask.png'));
  const [w, h] = [1024, 1024];

  const maskBuf = await sharp(rawMask).resize(w, h, { fit: 'fill' }).png().toBuffer();
  const imageBuf = await sharp(rawMask)
    .resize(w, h, { fit: 'fill' })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();

  const outDir = path.join(__dirname, 'test-output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'debug-image.png'), imageBuf);
  fs.writeFileSync(path.join(outDir, 'debug-mask.png'), maskBuf);

  const maskMeta = await sharp(maskBuf).stats();
  const imageMeta = await sharp(imageBuf).stats();
  console.log('mask channels:', maskMeta.channels.length, 'hasAlpha:', (await sharp(maskBuf).metadata()).hasAlpha);
  console.log('image channels:', imageMeta.channels.length, 'hasAlpha:', (await sharp(imageBuf).metadata()).hasAlpha);
  console.log('Wrote test-output/debug-image.png and debug-mask.png');
})();
