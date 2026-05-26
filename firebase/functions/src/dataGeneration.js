/* eslint-disable indent, max-len, quotes, object-curly-spacing */
/**
 * Data Generation Functions
 * Handles daily menu data generation, nutrition information, images, and notifications
 * Includes enhanced image caching with fuzzy matching
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { Storage } = require('@google-cloud/storage');
const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const { saveJson, saveBuffer, replaceGermanUmlauts } = require('./helpers');
const sharp = require('sharp');
const EnhancedImageCache = require('./enhancedCache');
const fs = require('fs');
const path = require('path');

const storage = new Storage();

/**
 * Get OpenAI client instance
 * @return {OpenAI} OpenAI client
 */
function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Centralized OpenAI configuration
 * Override via environment variables as needed
 */
const OPENAI_SETTINGS = {
  // Chat (used for nutrition + notifications)
  chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
  // Nutrition generation defaults
  chatMaxTokensNutrition: parseInt(process.env.OPENAI_CHAT_MAX_TOKENS_NUTRITION || '500', 10),
  // Notification generation defaults
  chatMaxTokensNotification: parseInt(process.env.OPENAI_CHAT_MAX_TOKENS_NOTIFICATION || '300', 10),
  // Images
  imageModel: process.env.OPENAI_IMAGE_MODEL || 'dall-e-2',
  imageSize: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
  imageQuality: process.env.OPENAI_IMAGE_QUALITY || 'medium',
};

/**
 * Main scheduled function to generate daily data
 * Runs at 02:00 Europe/Berlin time zone daily
 */
exports.generateDailyData = onSchedule({
  schedule: '0 2 * * *',
  timeZone: 'Europe/Berlin',
  region: process.env.FUNCTION_REGION || 'europe-west3',
  memory: '1GiB',
  timeoutSeconds: 3600, // 1 hour
  maxInstances: 1,
}, async (event) => {
  const bucketName = process.env.DATA_BUCKET;
  if (!bucketName) {
    console.error('Missing DATA_BUCKET environment variable');
    return;
  }

  const bucket = storage.bucket(bucketName);
  const imageCache = new EnhancedImageCache();

  console.log('=== Starting daily data generation ===');

  // Log initial cache stats
  const initialStats = await imageCache.getCacheStats();
  console.log(`Cache initialized with ${initialStats.totalEntries} entries`);

  // Ensure cache/ prefix exists (helps visibility in UIs)
  await ensureCachePrefixExists(bucket);

  // Delete old date folders (older than yesterday)
  await deleteOldDateFolders(bucket);

  const today = moment().tz('Europe/Berlin');
  let totalCacheHits = 0;
  let totalImagesGenerated = 0;

  // Process next 5 days
  for (let i = 0; i < 5; i++) {
    const d = today.clone().add(i, 'days').format('YYYY-MM-DD');
    const dir = `data/${d}`;

    console.log(`\n--- Processing ${d} ---`);

    // Skip if the folder for this date already exists
    const alreadyExists = await prefixExists(bucket, `${dir}/`);
    if (alreadyExists) {
      console.log(`Folder already exists for ${d}, skipping generation.`);
      continue;
    }

    const menu = await fetchMenu(d);
    if (!menu || menu.length === 0) {
      console.log(`No menu data for ${d}, skipping`);
      continue;
    }

    // Load prompts
    const nutritionPrompt = loadPrompt('nutritionalPrompt.txt');
    const notificationPrompt = loadPrompt('notificationPrompt.txt');

    // Generate nutrition information for each dish
    console.log('Generating nutrition information...');
    for (const dish of menu) {
      try {
        const completion = await generateNutritionForDish(dish.title, nutritionPrompt);
        dish.chat_completion = completion;
      } catch (error) {
        console.error(`Error generating nutrition for "${dish.title}":`, error);
        dish.chat_completion = '';
      }
    }

    // Save initial menu.json with nutrition data
    await saveJson(bucket, `${dir}/menu.json`, menu);
    console.log(`Saved menu.json with ${menu.length} dishes`);

    // Generate images for each dish
    console.log('Processing dish images...');
    for (let idx = 0; idx < menu.length; idx++) {
      const dish = menu[idx];
      // Numbered filenames in date folder: 1.jpg, 2.jpg, ...
      const imageFilename = `${idx + 1}.jpg`;
      const imagePath = `${dir}/${imageFilename}`;

      try {
        // Check cache first
        const cached = await imageCache.getCachedImage(dish.title);

        if (cached) {
          // Cache hit - copy existing image
          totalCacheHits++;
          console.log(`Cache hit (${cached.matchType}) for "${dish.title}" -> ${cached.filename}`);

          // Write cached image as JPEG to current location (ensures small size + correct type)
          await copyImageFromCache(bucket, cached.filename, imagePath);
          dish.imageUrl = imageFilename;

        } else {
          // No cache hit - generate new image
          totalImagesGenerated++;
          console.log(`Generating new image for "${dish.title}"`);

          const imageBuffer = await generateDishImage(dish); // likely PNG
          const jpegBuffer = await convertToJpeg(imageBuffer);
          await saveBuffer(bucket, imagePath, jpegBuffer, 'image/jpeg');
          dish.imageUrl = imageFilename;

          // Only cache non-placeholder images
          if (!isPlaceholderBuffer(imageBuffer)) {
            // Build cache filename from ordered key with umlauts replaced
            let orderedKey = imageCache.buildOrderedKey(dish.title);
            if (!orderedKey) {
              orderedKey = dish.title
                .toLowerCase()
                .replace(/[^\w\-äöüß]+/g, '_')
                .replace(/^_+|_+$/g, '');
            }
            const asciiKey = replaceGermanUmlauts(orderedKey);
            const cacheFilename = `${asciiKey}.jpg`;
            const cacheImagePath = `cache/${cacheFilename}`;
            await saveBuffer(bucket, cacheImagePath, jpegBuffer, 'image/jpeg');
            await imageCache.addToCache(dish.title, cacheFilename);
            console.log(`Added "${dish.title}" to cache as ${cacheFilename}`);
          } else {
            console.log(`Skipping cache for placeholder image of "${dish.title}"`);
          }
        }

      } catch (error) {
        console.error(`Error processing image for "${dish.title}":`, error);
        // Fallback to empty plate
        const placeholderBuffer = await generateEmptyPlateImage();
        const jpegPlaceholder = await convertToJpeg(placeholderBuffer);
        await saveBuffer(bucket, imagePath, jpegPlaceholder, 'image/jpeg');
        dish.imageUrl = imageFilename;
      }
    }

    // Re-save menu.json with imageUrl fields
    await saveJson(bucket, `${dir}/menu.json`, menu);

    // Generate notification
    console.log('Generating notification...');
    try {
      const notificationObj = await generateNotification(menu, notificationPrompt);
      await saveJson(bucket, `${dir}/notification.json`, notificationObj);
      console.log('Notification saved');
    } catch (error) {
      console.error('Error generating notification:', error);
      const fallbackNotification = {
        notification: {
          title: 'Speiseplan verfügbar',
          body: 'Schau dir das heutige Menü in der Mensa an!'
        }
      };
      await saveJson(bucket, `${dir}/notification.json`, fallbackNotification);
    }
  }

  // Final cache statistics
  const finalStats = await imageCache.getCacheStats();
  console.log('\n=== Generation Summary ===');
  console.log(`Cache hits: ${totalCacheHits}`);
  console.log(`New images generated: ${totalImagesGenerated}`);
  console.log(`Final cache size: ${finalStats.totalEntries} entries`);
  console.log(`Cache hit rate: ${totalCacheHits / (totalCacheHits + totalImagesGenerated) * 100}%`);

  if (finalStats.topReused && finalStats.topReused.length > 0) {
    console.log('\nTop 3 most reused images:');
    finalStats.topReused.slice(0, 3).forEach((entry, i) => {
      console.log(`${i + 1}. ${entry.key} (used ${entry.usageCount} times)`);
      console.log(`   Examples: ${entry.examples.slice(0, 2).join(', ')}`);
    });
  }

  console.log('=== Daily data generation completed ===');
});

/**
 * Ensure cache prefix exists by writing a small marker file once
 * @param {object} bucket
 */
async function ensureCachePrefixExists(bucket) {
  try {
    const marker = bucket.file('cache/.keep');
    const [exists] = await marker.exists();
    if (!exists) {
      await marker.save('cache marker', { contentType: 'text/plain', resumable: false, public: true });
      console.log('Created cache/.keep marker');
    }
  } catch (err) {
    console.warn('Failed to ensure cache prefix exists:', err.message || err);
  }
}

/**
 * Check if a prefix has any objects (i.e., the folder exists)
 * @param {object} bucket
 * @param {string} prefix
 * @return {Promise<boolean>}
 */
async function prefixExists(bucket, prefix) {
  const [files] = await bucket.getFiles({ prefix, maxResults: 1 });
  return files && files.length > 0;
}

/**
 * Delete date folders older than yesterday under data/
 * @param {object} bucket
 */
async function deleteOldDateFolders(bucket) {
  const yesterday = moment().tz('Europe/Berlin').subtract(1, 'day').format('YYYY-MM-DD');
  const [files] = await bucket.getFiles({ prefix: 'data/' });
  const prefixes = new Set();
  for (const f of files) {
    const name = f.name; // e.g., data/2025-08-10/menu.json
    const m = name.match(/^data\/(\d{4}-\d{2}-\d{2})\//);
    if (m) prefixes.add(m[1]);
  }
  for (const dateStr of prefixes) {
    if (dateStr < yesterday) {
      console.log(`Deleting old folder data/${dateStr}`);
      await bucket.deleteFiles({ prefix: `data/${dateStr}/` });
    }
  }
}

/**
 * Fetch menu data from the HTWK API
 * @param {string} dateIso Date in YYYY-MM-DD format
 * @return {Promise<Array>} Menu items array
 */
async function fetchMenu(dateIso) {
  const url = `https://app.htwk-leipzig.de/api/canteens/01FG1RPGG52ZKR7QABF75DCEP4/menus/${dateIso}?page=1&itemsPerPage=30`;

  try {
    const res = await fetchWithTimeout(url, { init: { headers: { accept: 'application/json' } }, timeoutMs: 12000, retry: 1 });
    if (!res.ok) {
      console.warn(`Failed to fetch menu for ${dateIso}: ${res.status} ${res.statusText}`);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error(`Error fetching menu for ${dateIso}:`, error);
    return [];
  }
}

/**
 * Generate nutrition information for a dish using OpenAI
 * @param {string} title Dish title
 * @param {string} systemPrompt System prompt for nutrition generation
 * @return {Promise<string>} Nutrition information
 */
async function generateNutritionForDish(title, systemPrompt) {
  try {
    const client = getOpenAIClient();
    const chatModel = OPENAI_SETTINGS.chatModel;
    const completion = await client.chat.completions.create({
      model: chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: title },
      ],
      max_tokens: OPENAI_SETTINGS.chatMaxTokensNutrition,
    });
    return completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content || '';
  } catch (error) {
    console.error('OpenAI nutrition generation error:', error);
    return '';
  }
}

/**
 * Generate a notification for the day's menu
 * @param {Array} menu Menu items
 * @param {string} systemPrompt System prompt for notification generation
 * @return {Promise<object>} Notification object
 */
async function generateNotification(menu, systemPrompt) {
  // Retry once for JSON format
  const client = getOpenAIClient();
  const chatModel = OPENAI_SETTINGS.chatModel;
  for (let i = 0; i < 2; i++) {
    try {
      const completion = await client.chat.completions.create({
        model: chatModel,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(menu) },
        ],
        max_tokens: OPENAI_SETTINGS.chatMaxTokensNotification,
      });

      const parsed = JSON.parse(completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content || '{}');
      if (parsed && parsed.notification && parsed.notification.title && parsed.notification.body) {
        return parsed;
      }
    } catch (error) {
      console.warn(`Notification generation attempt ${i + 1} failed:`, error);
    }
  }

  // Fallback notification
  return {
    notification: {
      title: 'Speiseplan verfügbar',
      body: 'Heute gibt es wieder leckere Gerichte in der Mensa!'
    }
  };
}

/**
 * Generate an image for a dish using OpenAI DALL-E with mask-based editing
 * Uses an empty plate mask image for consistent food presentation
 * @param {object} dish Dish object with at least title/category/selections
 * @return {Promise<Buffer>} Image buffer
 */
async function generateDishImage(dish) {
  try {
    const fullPrompt = buildImagePromptFromDish(dish);

    console.log(`Generating image with mask for: ${dish.title}`);

    const plateMaskPath = path.join(__dirname, '..', 'assets', 'plateMask.png');
    if (!fs.existsSync(plateMaskPath)) {
      console.warn('Plate mask not found, falling back to regular generation');
      return generateImageFallback(dish.title, fullPrompt);
    }

    // Normalize mask to the API's working size and derive an opaque white
    // reference image by flattening the same asset onto white — gives the
    // model a clean white-on-white "ghost plate" instead of a dark reference.
    const [w, h] = OPENAI_SETTINGS.imageSize.split('x').map((n) => parseInt(n, 10));
    const rawMask = fs.readFileSync(plateMaskPath);
    const plateMaskBuffer = await sharp(rawMask)
      .resize(w, h, { fit: 'fill' })
      .png()
      .toBuffer();
    const plateImageBuffer = await sharp(rawMask)
      .resize(w, h, { fit: 'fill' })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();

    const rawBuffer = await callImageEditWithMask(fullPrompt, plateImageBuffer, plateMaskBuffer);
    return await compositeWithPlateMask(rawBuffer, plateMaskBuffer);

  } catch (err) {
    console.error(`Image generation (edits) failed for "${dish.title}":`, err);
    return generateEmptyPlateImage();
  }
}

/**
 * Build the image generation prompt by injecting dish metadata
 * @param {object} dish
 * @return {string}
 */
function buildImagePromptFromDish(dish) {
  const imagePrompt = loadPrompt('imagePrompt.txt');
  const category = dish?.category || 'Gericht';
  const selections = formatSelections(dish?.selections);
  return imagePrompt
    .replace('{{title}}', dish.title)
    .replace('{{category}}', category)
    .replace('{{selections}}', selections);
}

/**
 * Format selections array for prompt text
 * @param {Array<string>} selections
 * @return {string}
 */
function formatSelections(selections) {
  if (!Array.isArray(selections) || selections.length === 0) return 'none';
  return selections.join(', ');
}

/**
 * Generate fallback image using regular DALL-E generation
 * @param {string} title Dish title
 * @param {string} prompt Full prompt
 * @return {Promise<Buffer>} Image buffer
 */
async function generateImageFallback(title, prompt) {
  try {
    const client = getOpenAIClient();
    const finalPrompt = prompt || `Food photography of "${title}" on a clean white plate, top-down shot, natural light, high detail`;
    const imageModel = OPENAI_SETTINGS.imageModel;
    const response = await client.images.generate({
      model: imageModel,
      prompt: finalPrompt,
      quality: OPENAI_SETTINGS.imageQuality,
      size: OPENAI_SETTINGS.imageSize,
    });

    const item = response?.data?.[0];
    if (item?.b64_json) {
      return Buffer.from(item.b64_json, 'base64');
    }
    if (item?.url) {
      const res = await fetch(item.url);
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    }
    throw new Error('No image returned from images.generate');

  } catch (error) {
    console.error('Fallback image generation failed:', error);
    return generateEmptyPlateImage();
  }
}

/**
 * Call OpenAI REST images/edits with a base image and a mask (same PNG with transparency)
 * @param {string} prompt
 * @param {Buffer} platePngBuffer
 * @return {Promise<Buffer>}
 */
async function callImageEditWithMask(prompt, imageBuffer, maskBuffer) {
  const form = new FormData();
  form.append('model', OPENAI_SETTINGS.imageModel);
  form.append('prompt', prompt);
  form.append('size', OPENAI_SETTINGS.imageSize);
  form.append('quality', OPENAI_SETTINGS.imageQuality);
  form.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'plate.png');
  form.append('mask', new Blob([maskBuffer], { type: 'image/png' }), 'mask.png');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`images/edits failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  const item = json?.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, 'base64');
  }
  if (item?.url) {
    const imgRes = await fetch(item.url);
    const arr = await imgRes.arrayBuffer();
    return Buffer.from(arr);
  }
  throw new Error('No image returned from images/edits');
}

/**
 * Composite the original plate mask back over the generated image so that
 * everything outside the transparent (editable) area is restored from the
 * reference plate. gpt-image-1.x does not enforce strict masking, so this is
 * what actually preserves rim, background, lighting and crop.
 * @param {Buffer} generatedBuffer Raw image from OpenAI
 * @param {Buffer} plateMaskBuffer Original plateMask.png (opaque rim/bg, transparent center)
 * @return {Promise<Buffer>} Composited PNG
 */
async function compositeWithPlateMask(generatedBuffer, plateMaskBuffer) {
  const meta = await sharp(plateMaskBuffer).metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1024;
  const baseAligned = await sharp(generatedBuffer)
    .resize(width, height, { fit: 'cover' })
    .toBuffer();
  return await sharp(baseAligned)
    .composite([{ input: plateMaskBuffer }])
    .png()
    .toBuffer();
}

/**
 * Fetch with timeout and simple retry helper
 */
async function fetchWithTimeout(url, { init = {}, timeoutMs = 10000, retry = 0 } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (err) {
    if (retry > 0) {
      await new Promise(r => setTimeout(r, 500));
      return fetchWithTimeout(url, { init, timeoutMs, retry: retry - 1 });
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Detect if a generated buffer is a placeholder (plate PNG or minimal PNG)
 * @param {Buffer} buf
 * @return {boolean}
 */
function isPlaceholderBuffer(buf) {
  try {
    const emptyPlatePath = path.join(__dirname, '..', 'assets', 'emptyPlate.png');
    if (fs.existsSync(emptyPlatePath)) {
      const emptyPlate = fs.readFileSync(emptyPlatePath);
      if (buf.length === emptyPlate.length && buf.equals(emptyPlate)) return true;
    }
  } catch { }
  try {
    const plateMaskPath = path.join(__dirname, '..', 'assets', 'plateMask.png');
    if (fs.existsSync(plateMaskPath)) {
      const plate = fs.readFileSync(plateMaskPath);
      if (buf.length === plate.length && buf.equals(plate)) return true;
    }
  } catch { }
  try {
    const minimal = createMinimalPlateBuffer();
    if (buf.length === minimal.length && buf.equals(minimal)) return true;
  } catch { }
  return false;
}

/**
 * Generate an empty plate image as final fallback
 * Uses the plate mask if available, otherwise creates a simple placeholder
 * @return {Promise<Buffer>} Empty plate image buffer
 */
async function generateEmptyPlateImage() {
  try {
    const emptyPlatePath = path.join(__dirname, '..', 'assets', 'emptyPlate.png');
    if (fs.existsSync(emptyPlatePath)) {
      return fs.readFileSync(emptyPlatePath); // PNG
    }
    const plateMaskPath = path.join(__dirname, '..', 'assets', 'plateMask.png');
    if (fs.existsSync(plateMaskPath)) {
      return fs.readFileSync(plateMaskPath); // PNG
    }
    console.warn('Empty plate asset not found, creating minimal placeholder');
    return createMinimalPlateBuffer(); // PNG (1x1)
  } catch (error) {
    console.error('Failed to generate empty plate image:', error);
    return createMinimalPlateBuffer();
  }
}

/**
 * Create a minimal plate buffer as last resort
 * @return {Buffer} Minimal image buffer
 */
function createMinimalPlateBuffer() {
  // Create a minimal 1x1 transparent PNG
  const minimalPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
    0x42, 0x60, 0x82
  ]);
  return minimalPNG;
}

/**
 * Convert any input image buffer to a compressed JPEG buffer.
 * Flattens transparency onto white to avoid black backgrounds.
 * @param {Buffer} inputBuffer
 * @return {Promise<Buffer>}
 */
async function convertToJpeg(inputBuffer) {
  try {
    const quality = parseInt(process.env.JPEG_QUALITY || '85', 10);
    return await sharp(inputBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality, mozjpeg: true, progressive: true })
      .toBuffer();
  } catch (err) {
    console.warn('JPEG conversion failed, returning original buffer:', err?.message || err);
    return inputBuffer;
  }
}

/**
 * Copy an image from cache location to a new location in the bucket
 * @param {object} bucket GCS bucket object
 * @param {string} cachedFilename Original cached filename
 * @param {string} newPath New path for the image
 */
async function copyImageFromCache(bucket, cachedFilename, newPath) {
  try {
    const sourceFile = bucket.file(`cache/${cachedFilename}`);
    const [exists] = await sourceFile.exists();
    if (!exists) throw new Error(`Source not found: cache/${cachedFilename}`);
    const [buffer] = await sourceFile.download();
    const jpegBuffer = await convertToJpeg(buffer);
    await saveBuffer(bucket, newPath, jpegBuffer, 'image/jpeg');
    console.log(`Wrote cached image as JPEG ${cachedFilename} -> ${newPath}`);
  } catch (error) {
    console.error(`Failed to copy cached image ${cachedFilename}:`, error);
    // Fallback: generate empty plate
    const placeholderBuffer = await generateEmptyPlateImage();
    const jpegPlaceholder = await convertToJpeg(placeholderBuffer);
    await saveBuffer(bucket, newPath, jpegPlaceholder, 'image/jpeg');
  }
}

/**
 * Load a prompt file from the prompts directory
 * @param {string} filename Prompt filename
 * @return {string} Prompt content
 */
function loadPrompt(filename) {
  try {
    return require('fs').readFileSync(
      require('path').join(__dirname, '..', 'prompts', filename),
      'utf8'
    );
  } catch (error) {
    console.error(`Failed to load prompt ${filename}:`, error);
    return '';
  }
}

exports._internal = {
  generateDishImage,
  buildImagePromptFromDish,
  compositeWithPlateMask,
};
