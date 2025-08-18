/* eslint-disable indent, max-len, quotes, object-curly-spacing */
/**
 * Data Generation Helper
 * Provides utility functions for data generation, including saving data to GCS.
 */

const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

/**
 * Saves a JSON object to a GCS bucket.
 * @param {object} bucket GCS bucket object
 * @param {string} path Path to save the file to
 * @param {object} obj The JSON object to save
 */
async function saveJson(bucket, path, obj) {
  const file = bucket.file(path);
  await file.save(JSON.stringify(obj, null, 2), {
    contentType: 'application/json',
    resumable: false,
    public: true,
    metadata: { cacheControl: 'public, max-age=300' }
  });
}

/**
 * Saves a buffer to a GCS bucket.
 * @param {object} bucket GCS bucket object
 * @param {string} path Path to save the file to
 * @param {Buffer} buffer The buffer to save
 * @param {string} contentType The content type of the buffer
 */
async function saveBuffer(bucket, path, buffer, contentType) {
  const file = bucket.file(path);
  const isImage = contentType && contentType.startsWith('image/');
  await file.save(buffer, {
    contentType,
    resumable: false,
    public: true,
    metadata: { cacheControl: isImage ? 'public, max-age=31536000, immutable' : 'public, max-age=300' }
  });
}

/**
 * Replace German umlauts and ß with ASCII equivalents for filenames.
 * @param {string} input
 * @return {string}
 */
function replaceGermanUmlauts(input) {
  if (!input) return input;
  return input
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

module.exports = { saveJson, saveBuffer, replaceGermanUmlauts };
