/**
 * Local test script for Firebase Functions
 * Tests the enhanced cache system without deploying
 */

const admin = require('firebase-admin');

// Initialize with local emulator or service account
// For local testing, you can use Firebase emulators
try {
  admin.initializeApp();
} catch (error) {
  console.log('Firebase already initialized');
}

const EnhancedImageCache = require('./src/enhancedCache');

async function testEnhancedCache() {
  console.log('=== Testing Enhanced Image Cache ===\n');
  
  const cache = new EnhancedImageCache();
  
  // Test cases - these should demonstrate various normalization scenarios
  const testTitles = [
    "Hähnchen Crossies mit Tomaten-Paprika-Dip | Steakhouse Pommes | Frischer Salatmix",
    "Hähnchen Crossies mit Tomaten Paprika Dip, Steakhouse Frites, Frischer Salatmix",
    "HÄHNCHEN crossies MIT tomaten&paprika dip / steakhouse pommes / frischer salatmix",
    "Gemüsekroketten mit Tomaten-Chili-Dip dazu Orangenpolenta",
    "Gemüsekroketten, Tomaten Chili Dip, Orangenpolenta", 
    "Sesam-Gemüsepfanne dazu Jasminreis",
    "Sesam Gemüsepfanne mit Jasmin-Reis",
    "Seelachs mit Blattspinat & Mozzarella überbacken | Tomaten-Vollkornreis",
    "Seelachs mit Spinat und Mozzarella, Tomaten Vollkornreis",
  ];
  
  console.log('Testing title normalization and cache key building:\n');
  
  for (let i = 0; i < testTitles.length; i++) {
    const title = testTitles[i];
    console.log(`${i + 1}. "${title}"`);
    
    // Build canonical key
    const canonicalKey = cache.buildCanonicalKey(title);
    console.log(`   Key: ${canonicalKey}`);
    
    // Simulate adding to cache (first few items)
    if (i < 3) {
      const cacheKey = await cache.addToCache(title, `image_${i}.jpg`);
      console.log(`   Added to cache with key: ${cacheKey}`);
    } else {
      // Test cache lookups for variations
      const cached = await cache.getCachedImage(title);
      if (cached) {
        console.log(`   ✅ Cache hit (${cached.matchType}): ${cached.filename}`);
      } else {
        console.log(`   ❌ No cache hit - would generate new image`);
      }
    }
    console.log();
  }
  
  // Get cache statistics
  console.log('=== Cache Statistics ===');
  const stats = await cache.getCacheStats();
  console.log(`Total entries: ${stats.totalEntries}`);
  
  if (stats.totalEntries > 0) {
    console.log(`Average usage: ${stats.avgUsage.toFixed(1)}`);
    console.log(`Max usage: ${stats.maxUsage}`);
    
    if (stats.topReused.length > 0) {
      console.log('\nTop reused images:');
      stats.topReused.forEach((entry, i) => {
        console.log(`${i + 1}. ${entry.key} (used ${entry.usageCount} times)`);
        console.log(`   Examples: ${entry.examples.slice(0, 2).join(', ')}`);
      });
    }
  }
  
  console.log('\n=== Test completed ===');
}

// Test normalization functions directly
function testNormalization() {
  console.log('\n=== Testing Normalization Functions ===');
  
  const cache = new EnhancedImageCache();
  
  const testCases = [
    "Hähnchen Crossies mit Tomaten-Paprika-Dip | Steakhouse Pommes",
    "HÄHNCHEN CROSSIES & POMMES FRITES / SALAT",
    "Gemüsekroketten, dazu Tomaten-Chili-Dip",
  ];
  
  testCases.forEach((title, i) => {
    console.log(`\n${i + 1}. Original: "${title}"`);
    
    const normalized = cache.normalizeString(title);
    console.log(`   Normalized: "${normalized}"`);
    
    const tokens = cache.cleanAndNormalizeTokens(normalized);
    console.log(`   Tokens: [${tokens.join(', ')}]`);
    
    const key = cache.buildCanonicalKey(title);
    console.log(`   Final Key: "${key}"`);
  });
}

// Run tests
if (require.main === module) {
  console.log('Starting Firebase Functions local tests...\n');
  
  testNormalization();
  
  // Only run cache tests if connected to Firestore
  // testEnhancedCache().catch(console.error);
  
  console.log('\nLocal tests completed. To test with Firestore, run Firebase emulators.');
}
