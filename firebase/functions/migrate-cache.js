#!/usr/bin/env node
/**
 * Cache Migration Script
 * Uploads existing local cache to Google Cloud Storage and indexes in Firestore
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const EnhancedImageCache = require('./src/enhancedCache');

// Initialize Firebase (you'll need to set GOOGLE_APPLICATION_CREDENTIALS)
admin.initializeApp();
const storage = new Storage();
const imageCache = new EnhancedImageCache();

const LOCAL_CACHE_DIR = '../../nightly_task/out/cache';
const BUCKET_NAME = process.env.DATA_BUCKET; 
const CACHE_PREFIX = 'cache/';

/**
 * Parse old cache filename format: 001_Title_With_Underscores.jpg
 */
function parseOldFilename(filename) {
  const match = filename.match(/^(\d{3,})_(.+)\.jpg$/);
  if (!match) return null;
  
  const [, number, encodedTitle] = match;
  const title = encodedTitle.replace(/_/g, ' ');
  
  return { number, title, filename };
}

/**
 * Upload a file to Google Cloud Storage
 */
async function uploadToGCS(localPath, gcsPath) {
  const bucket = storage.bucket(BUCKET_NAME);
  
  try {
    await bucket.upload(localPath, {
      destination: gcsPath,
      metadata: {
        cacheControl: 'public, max-age=31536000', // 1 year cache
      },
      public: true,
    });
    
    console.log(`✅ Uploaded: ${path.basename(localPath)} -> ${gcsPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Upload failed for ${localPath}:`, error.message);
    return false;
  }
}

/**
 * Generate new sequential filename
 */
let currentSequence = 1;
function getNextFilename() {
  const filename = `img_${String(currentSequence).padStart(4, '0')}.jpg`;
  currentSequence++;
  return filename;
}

/**
 * Main migration function
 */
async function migrateCacheToGCS() {
  if (!BUCKET_NAME) {
    console.error('❌ DATA_BUCKET environment variable not set');
    process.exit(1);
  }

  if (!fs.existsSync(LOCAL_CACHE_DIR)) {
    console.error(`❌ Local cache directory not found: ${LOCAL_CACHE_DIR}`);
    process.exit(1);
  }

  console.log('🚀 Starting cache migration...');
  console.log(`📂 Local cache: ${LOCAL_CACHE_DIR}`);
  console.log(`☁️  Target bucket: ${BUCKET_NAME}`);

  // Get all cache files
  const cacheFiles = fs.readdirSync(LOCAL_CACHE_DIR)
    .filter(file => file.endsWith('.jpg'))
    .sort();

  console.log(`📊 Found ${cacheFiles.length} cache images`);

  let uploaded = 0;
  let indexed = 0;
  let skipped = 0;

  // Process each cache file
  for (const filename of cacheFiles) {
    const parsed = parseOldFilename(filename);
    if (!parsed) {
      console.warn(`⚠️  Skipping invalid filename: ${filename}`);
      skipped++;
      continue;
    }

    const localPath = path.join(LOCAL_CACHE_DIR, filename);
    const newFilename = getNextFilename();
    const gcsPath = `${CACHE_PREFIX}${newFilename}`;

    // Upload to GCS
    const uploadSuccess = await uploadToGCS(localPath, gcsPath);
    if (uploadSuccess) {
      uploaded++;
      
      // Add to enhanced cache index
      try {
        await imageCache.addToCache(parsed.title, newFilename);
        indexed++;
        console.log(`📝 Indexed: "${parsed.title}" -> ${newFilename}`);
      } catch (error) {
        console.error(`❌ Indexing failed for "${parsed.title}":`, error.message);
      }
    }

    // Add small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n🎉 Migration completed!');
  console.log(`📊 Statistics:`);
  console.log(`   - Total files: ${cacheFiles.length}`);
  console.log(`   - Uploaded: ${uploaded}`);
  console.log(`   - Indexed: ${indexed}`);
  console.log(`   - Skipped: ${skipped}`);

  // Get final cache statistics
  const stats = await imageCache.getCacheStats();
  console.log(`\n📈 Final cache size: ${stats.totalEntries} entries`);
}

/**
 * Validate that everything is ready for migration
 */
async function validateSetup() {
  console.log('🔍 Validating setup...');

  // Check if Firebase is properly initialized
  try {
    const db = admin.firestore();
    await db.collection('test').limit(1).get();
    console.log('✅ Firestore connection OK');
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
    return false;
  }

  // Check if GCS bucket is accessible
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    await bucket.getMetadata();
    console.log('✅ GCS bucket accessible');
  } catch (error) {
    console.error('❌ GCS bucket access failed:', error.message);
    return false;
  }

  return true;
}

// Main execution
if (require.main === module) {
  console.log('📦 MensaPWA Cache Migration Tool\n');

  validateSetup()
    .then(valid => {
      if (valid) {
        return migrateCacheToGCS();
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCacheToGCS, parseOldFilename };
