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
const { atomize } = require('./atomize');
const { compositeAtoms } = require('./compositeAtoms');
const fs = require('fs');
const path = require('path');

const FULL_PLATE_MASK_PATH = path.join(__dirname, '..', 'assets', 'full-plate-mask.png');
let _fullPlateMaskCache = null;
function getFullPlateMask() {
  if (!_fullPlateMaskCache) _fullPlateMaskCache = fs.readFileSync(FULL_PLATE_MASK_PATH);
  return _fullPlateMaskCache;
}

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
  chatReasoningEffort: process.env.OPENAI_CHAT_REASONING_EFFORT || 'low',
  // Nutrition generation defaults
  chatMaxTokensNutrition: parseInt(process.env.OPENAI_CHAT_MAX_TOKENS_NUTRITION || (isReasoningChatModel(process.env.OPENAI_CHAT_MODEL) ? '1500' : '500'), 10),
  // Notification generation defaults
  chatMaxTokensNotification: parseInt(process.env.OPENAI_CHAT_MAX_TOKENS_NOTIFICATION || (isReasoningChatModel(process.env.OPENAI_CHAT_MODEL) ? '1000' : '300'), 10),
  // Images
  imageModel: process.env.OPENAI_IMAGE_MODEL || 'dall-e-2',
  imageSize: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
  imageQuality: process.env.OPENAI_IMAGE_QUALITY || 'medium',
};

/**
 * GPT-5/o-series chat models spend part of the completion budget on reasoning.
 * Keep older chat models free of reasoning-only parameters.
 * @param {string} model OpenAI model name
 * @return {boolean} Whether model uses reasoning-style chat params
 */
function isReasoningChatModel(model) {
  return /^(gpt-5|o[1-9])/.test(model || '');
}

/**
 * Main scheduled function to generate daily data
 * Runs at 02:00 Europe/Berlin time zone daily
 */
exports.generateDailyData = onSchedule({
  schedule: '0 2 * * *',
  timeZone: 'Europe/Berlin',
  region: process.env.FUNCTION_REGION || 'europe-west3',
  memory: '1GiB',
  timeoutSeconds: 1800, // 30 min (max for scheduled functions)
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
  let totalAtomHits = 0;
  let totalAtomGenerations = 0;
  let totalDishesSkipped = 0;

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

    // Generate images for each dish via the atomic pipeline:
    //   atomize → per-atom cache lookup → compose at runtime with shadow.
    console.log('Processing dish images...');
    for (let idx = 0; idx < menu.length; idx++) {
      const dish = menu[idx];
      const imageFilename = `${idx + 1}.jpg`;
      const imagePath = `${dir}/${imageFilename}`;

      try {
        const { skip, atoms } = atomize(dish.title, dish.category);
        if (skip) {
          // Smoothie: the PWA renders a static collage, no image needed.
          console.log(`Skipping image generation for "${dish.title}" (category: ${dish.category})`);
          dish.imageUrl = null;
          totalDishesSkipped++;
          continue;
        }

        // Collect each atom (cache hit or fresh OpenAI call).
        const atomBuffers = [];
        for (const atomTitle of atoms) {
          const r = await getOrGenerateAtomBuffer(bucket, imageCache, atomTitle, dish);
          if (r && r.buffer) {
            atomBuffers.push(r.buffer);
            if (r.hit) totalAtomHits++; else totalAtomGenerations++;
          }
        }
        if (atomBuffers.length === 0) throw new Error('no atom buffers produced');

        // Compose with shadow + transparent canvas, then JPEG-encode for
        // the per-day file (smaller, the PWA card surface is white anyway).
        const composite = await compositeAtoms(atomBuffers);
        const jpegBuffer = await convertToJpeg(composite);
        await saveBuffer(bucket, imagePath, jpegBuffer, 'image/jpeg');
        dish.imageUrl = imageFilename;
      } catch (error) {
        console.error(`Error processing image for "${dish.title}":`, error);
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
  const totalAtoms = totalAtomHits + totalAtomGenerations;
  const hitRate = totalAtoms === 0 ? 0 : (totalAtomHits / totalAtoms) * 100;
  console.log(`Atom hits: ${totalAtomHits}`);
  console.log(`Atom generations (OpenAI calls): ${totalAtomGenerations}`);
  console.log(`Dishes skipped (Smoothie): ${totalDishesSkipped}`);
  console.log(`Atom cache size: ${finalStats.totalEntries} entries`);
  console.log(`Atom hit rate: ${hitRate.toFixed(1)}%`);

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
      max_completion_tokens: OPENAI_SETTINGS.chatMaxTokensNutrition,
      ...(isReasoningChatModel(chatModel) ? { reasoning_effort: OPENAI_SETTINGS.chatReasoningEffort } : {}),
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
        max_completion_tokens: OPENAI_SETTINGS.chatMaxTokensNotification,
        ...(isReasoningChatModel(chatModel) ? { reasoning_effort: OPENAI_SETTINGS.chatReasoningEffort } : {}),
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

/**
 * Round-crop a raw OpenAI+plateMask buffer with the full-plate mask, so
 * only the plate is opaque (corners go transparent). This is the shape
 * we cache as an "atom" — composite-ready.
 */
async function roundCropToAtom(buf) {
  const mask = await sharp(getFullPlateMask())
    .resize(1024, 1024, { fit: 'fill' })
    .toBuffer();
  const resized = await sharp(buf)
    .resize(1024, 1024, { fit: 'cover' })
    .ensureAlpha()
    .toBuffer();
  return await sharp(resized)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/**
 * Return an atom buffer for one slot of a dish, hitting the atom cache
 * if possible, otherwise calling OpenAI and storing the result.
 */
async function getOrGenerateAtomBuffer(bucket, imageCache, atomTitle, parentDish) {
  try {
    const cached = await imageCache.getCachedImage(atomTitle);
    if (cached && cached.filename) {
      const file = bucket.file(cached.filename);
      const [exists] = await file.exists();
      if (exists) {
        const [buf] = await file.download();
        console.log(`Atom hit (${cached.matchType}): "${atomTitle}" -> ${cached.filename}`);
        return { buffer: buf, hit: true };
      }
      console.warn(`Atom cache pointed at missing file ${cached.filename} for "${atomTitle}", regenerating`);
    }
  } catch (err) {
    console.error(`Atom cache lookup failed for "${atomTitle}":`, err);
  }

  console.log(`Generating new atom for "${atomTitle}"`);
  const rawBuf = await generateDishImage({
    title: atomTitle,
    category: parentDish.category || 'Gericht',
    selections: parentDish.selections || [],
  });
  if (isPlaceholderBuffer(rawBuf)) {
    console.warn(`Got placeholder for atom "${atomTitle}", not caching`);
    return { buffer: rawBuf, hit: false };
  }
  const atomBuf = await roundCropToAtom(rawBuf);

  // Persist with a filesystem-safe ascii filename based on the ordered key.
  let orderedKey = imageCache.buildOrderedKey(atomTitle);
  if (!orderedKey) {
    orderedKey = atomTitle.toLowerCase().replace(/[^\w\-äöüß]+/g, '_').replace(/^_+|_+$/g, '');
  }
  const asciiKey = replaceGermanUmlauts(orderedKey);
  const atomPath = `atoms/${asciiKey}.png`;
  try {
    await saveBuffer(bucket, atomPath, atomBuf, 'image/png');
    await imageCache.addToCache(atomTitle, atomPath);
    console.log(`Cached atom "${atomTitle}" -> ${atomPath}`);
  } catch (err) {
    console.error(`Failed to persist atom "${atomTitle}":`, err);
  }
  return { buffer: atomBuf, hit: false };
}

exports._internal = {
  generateDishImage,
  buildImagePromptFromDish,
  compositeWithPlateMask,
  roundCropToAtom,
  getOrGenerateAtomBuffer,
};
