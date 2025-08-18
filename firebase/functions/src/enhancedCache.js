/* eslint-disable indent, max-len, quotes, object-curly-spacing */
/**
 * Enhanced Image Cache for Firebase Functions
 * Implements title normalization, fuzzy matching, and intelligent caching
 */

const admin = require('firebase-admin');

// German stopwords and functional words to remove
const STOP_WORDS = new Set([
  'mit', 'und', 'oder', 'auf', 'dazu', 'vom', 'der', 'die', 'das',
  'im', 'in', 'am', 'an', 'zu', 'zum', 'zur', 'ohne', 'von',
  'bei', 'nach', 'über', 'unter', 'gegen', 'durch', 'für',
  'frisch', 'frische', 'frischer', 'frisches', 'hausgemacht', 'hausgemachte',
  'selbstgemacht', 'selbstgemachte', 'lecker', 'köstlich', 'fein', 'zart',
  'knusprig', 'cremig', 'würzig', 'aromatisch'
]);

// Synonyms to normalize variant spellings and near-duplicates
const SYNONYMS = {
  // Potato variants
  'pommes': 'pommes', 'chips': 'pommes', 'frites': 'pommes',
  'rustico': 'pommes', 'kartoffeltwister': 'pommes',
  'steakhouse': 'pommes', 'wedges': 'pommes',

  // Yogurt variants
  'joghurt': 'joghurt', 'yoghurt': 'joghurt',

  // Common misspellings
  'rapunsel': 'rapunzel', 'paprica': 'paprika',

  // Meat variants
  'hähnchen': 'hähnchen', 'huhn': 'hähnchen', 'chicken': 'hähnchen',
  'schwein': 'schwein', 'schweine': 'schwein', 'pork': 'schwein',
  'rind': 'rind', 'rindfleisch': 'rind', 'beef': 'rind',
  'pute': 'pute', 'truthahn': 'pute', 'turkey': 'pute',

  // Fish variants
  'fisch': 'fisch', 'seelachs': 'seelachs', 'lachs': 'lachs',
  'thunfisch': 'thunfisch', 'forelle': 'forelle',

  // Cheese variants
  'käse': 'käse', 'mozzarella': 'mozzarella', 'gouda': 'gouda',
  'frischkäse': 'frischkäse', 'parmesan': 'parmesan',

  // Vegetarian proteins
  'tofu': 'tofu', 'tempeh': 'tempeh', 'seitan': 'seitan',

  // Rice and grains
  'reis': 'reis', 'jasminreis': 'reis', 'basmatireis': 'reis',
  'vollkornreis': 'vollkornreis', 'wildreis': 'wildreis',
  'quinoa': 'quinoa', 'bulgur': 'bulgur', 'couscous': 'couscous',

  // Pasta
  'nudeln': 'nudeln', 'spaghetti': 'spaghetti', 'penne': 'penne',
  'schupfnudeln': 'schupfnudeln', 'gnocchi': 'gnocchi',

  // Vegetables
  'brokkoli': 'brokkoli', 'blumenkohl': 'blumenkohl',
  'spinat': 'spinat', 'blattspinat': 'spinat',
  'paprika': 'paprika', 'tomaten': 'tomaten',
  'zwiebeln': 'zwiebeln', 'möhren': 'möhren', 'karotten': 'möhren',
};

// Critical tokens that should not be fuzzy matched if different
const CRITICAL_TOKENS = new Set([
  'hähnchen', 'schwein', 'rind', 'pute', 'fisch', 'seelachs', 'lachs',
  'thunfisch', 'forelle', 'tofu', 'käse', 'mozzarella', 'frischkäse',
  'spinat', 'brokkoli', 'blumenkohl', 'curry', 'chili', 'thai'
]);

class EnhancedImageCache {
  constructor() {
    this.db = admin.firestore();
    this.cacheCollection = 'imagesCache';
    this.inMemoryIndex = new Map(); // Cache for frequently accessed items
    this._entriesCache = null; // Cached list of all entries for fuzzy matching
    this._entriesCacheAt = 0;  // Timestamp
  }

  /**
   * Pre-normalize string (step 1)
   * @param {string} text Input text to normalize
   * @return {string} Normalized text
   */
  normalizeString(text) {
    if (!text) return '';

    let s = text.toLowerCase();

    // Replace separators with spaces
    s = s.replace(/[|/&,]+/g, ' ');

    // Remove diacritics except German umlauts (simplified version)
    s = s.replace(/["""„«»]/g, '');

    // Collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();

    return s;
  }

  /**
   * Token cleanup and normalization (step 2)
   * @param {string} normalizedString Pre-normalized string
   * @return {Array<string>} Array of normalized tokens
   */
  cleanAndNormalizeTokens(normalizedString) {
    // Split into tokens
    const rawTokens = normalizedString.split(' ');

    const normalizedTokens = [];
    for (let token of rawTokens) {
      // Remove bracketed/quoted content
      token = token.replace(/\([^)]*\)/g, '');
      token = token.replace(/"[^"]*"/g, '');
      token = token.replace(/\([^)]*g\)/g, ''); // Remove weight indicators

      // Remove punctuation except hyphens
      token = token.replace(/[^\w\-äöüß]/g, '');

      if (!token) continue;

      // Drop pure numbers and measurements
      if (/^\d+$/.test(token) || token.endsWith('g') || token.endsWith('ml')) {
        continue;
      }

      // Apply synonyms
      if (SYNONYMS[token]) {
        token = SYNONYMS[token];
      }

      // Remove stopwords
      if (STOP_WORDS.has(token)) {
        continue;
      }

      if (token.length > 1) { // Keep tokens with more than 1 character
        normalizedTokens.push(token);
      }
    }

    return normalizedTokens;
  }

  /**
   * Build canonical cache key from dish title
   * @param {string} title Dish title
   * @return {string} Canonical cache key
   */
  buildCanonicalKey(title) {
    if (!title) return '';

    // Step 1: Pre-normalize
    const normalized = this.normalizeString(title);

    // Step 2: Token cleanup and normalization
    const tokens = this.cleanAndNormalizeTokens(normalized);

    if (tokens.length === 0) return '';

    // Step 3: Sort tokens alphabetically and remove duplicates
    const sortedTokens = [...new Set(tokens)].sort();

    // Step 4: Join with underscore
    return sortedTokens.join('_');
  }

  /**
   * Build a cache key from dish title preserving token order
   * Uses the same normalization and cleanup but does not sort tokens
   * @param {string} title Dish title
   * @return {string} Ordered cache key
   */
  buildOrderedKey(title) {
    if (!title) return '';
    const normalized = this.normalizeString(title);
    const tokens = this.cleanAndNormalizeTokens(normalized);
    if (tokens.length === 0) return '';
    return tokens.join('_');
  }

  /**
   * Extract critical tokens from a list
   * @param {Array<string>} tokens Array of tokens
   * @return {Set<string>} Set of critical tokens
   */
  getCriticalTokens(tokens) {
    return new Set(tokens.filter(token => CRITICAL_TOKENS.has(token)));
  }

  /**
   * Simple token similarity calculation (since we don't have rapidfuzz)
   * @param {string} str1 First string
   * @param {string} str2 Second string
   * @return {number} Similarity score (0-100)
   */
  calculateSimilarity(str1, str2) {
    const tokens1 = new Set(str1.split(' '));
    const tokens2 = new Set(str2.split(' '));

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return (intersection.size / union.size) * 100;
  }

  /**
   * Find fuzzy match using token similarity
   * @param {string} canonicalKey Current canonical key
   * @param {Array<string>} tokens Current tokens
   * @param {Array} existingEntries Existing cache entries
   * @return {string|null} Best matching key or null
   */
  findFuzzyMatch(canonicalKey, tokens, existingEntries) {
    if (!canonicalKey) return null;

    const currentCritical = this.getCriticalTokens(tokens);
    const currentTokenString = tokens.sort().join(' ');

    let bestMatch = null;
    let bestScore = 0;

    for (const entry of existingEntries) {
      const existingTokens = entry.key.split('_');
      const existingCritical = this.getCriticalTokens(existingTokens);

      // Veto rule: critical tokens must match
      if (currentCritical.size !== existingCritical.size ||
        ![...currentCritical].every(token => existingCritical.has(token))) {
        continue;
      }

      const existingTokenString = existingTokens.sort().join(' ');
      const similarity = this.calculateSimilarity(currentTokenString, existingTokenString);

      if (similarity >= 85 && similarity > bestScore) {
        bestScore = similarity;
        bestMatch = entry.key;
      }
    }

    if (bestMatch) {
      console.log(`Fuzzy match found: '${canonicalKey}' -> '${bestMatch}' (score: ${bestScore})`);
    }

    return bestMatch;
  }

  /**
   * Get cached image for a dish title
   * @param {string} title Dish title
   * @return {Promise<{filename: string, matchType: string}|null>} Cache result or null
   */
  async getCachedImage(title) {
    const canonicalKey = this.buildCanonicalKey(title);

    if (!canonicalKey) return null;

    // Check in-memory cache first
    if (this.inMemoryIndex.has(canonicalKey)) {
      const entry = this.inMemoryIndex.get(canonicalKey);
      console.log(`In-memory cache hit: '${title}' -> ${entry.storagePath}`);
      return { filename: entry.storagePath, matchType: 'exact' };
    }

    try {
      // Check for exact match in Firestore
      const doc = await this.db.collection(this.cacheCollection).doc(canonicalKey).get();

      if (doc.exists) {
        const entry = doc.data();
        // Update usage count and examples
        await doc.ref.update({
          usageCount: admin.firestore.FieldValue.increment(1),
          examples: admin.firestore.FieldValue.arrayUnion(title),
          lastUsed: admin.firestore.FieldValue.serverTimestamp()
        });

        // Add to in-memory cache
        this.inMemoryIndex.set(canonicalKey, entry);

        console.log(`Exact cache hit: '${title}' -> ${entry.storagePath}`);
        return { filename: entry.storagePath, matchType: 'exact' };
      }

      // Try fuzzy matching
      const tokens = this.cleanAndNormalizeTokens(this.normalizeString(title));

      // Get all cache entries for fuzzy matching with TTL (60s)
      let existingEntries = this._entriesCache;
      const now = Date.now();
      if (!existingEntries || (now - this._entriesCacheAt) > 60000) {
        const snapshot = await this.db.collection(this.cacheCollection).get();
        existingEntries = snapshot.docs.map(doc => ({ key: doc.id, ...doc.data() }));
        this._entriesCache = existingEntries;
        this._entriesCacheAt = now;
      }

      const fuzzyMatchKey = this.findFuzzyMatch(canonicalKey, tokens, existingEntries);

      if (fuzzyMatchKey) {
        const fuzzyDoc = await this.db.collection(this.cacheCollection).doc(fuzzyMatchKey).get();
        if (fuzzyDoc.exists) {
          const entry = fuzzyDoc.data();

          // Update usage count and examples
          await fuzzyDoc.ref.update({
            usageCount: admin.firestore.FieldValue.increment(1),
            examples: admin.firestore.FieldValue.arrayUnion(title),
            lastUsed: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log(`Fuzzy cache hit: '${title}' -> ${entry.storagePath}`);
          return { filename: entry.storagePath, matchType: 'fuzzy' };
        }
      }

      console.log(`No cache match found for: '${title}' (key: ${canonicalKey})`);
      return null;

    } catch (error) {
      console.error('Error checking cache:', error);
      return null;
    }
  }

  /**
   * Add a new image to the cache
   * @param {string} title Original dish title
   * @param {string} storagePath Path to the stored image
   * @return {Promise<string>} The canonical cache key that was used
   */
  async addToCache(title, storagePath) {
    let canonicalKey = this.buildCanonicalKey(title);

    if (!canonicalKey) {
      // Fallback: use sanitized title if normalization fails
      canonicalKey = title.toLowerCase().replace(/[^\w\-äöüß]/g, '_');
    }

    try {
      const cacheEntry = {
        key: canonicalKey,
        storagePath: storagePath,
        examples: [title],
        firstSeen: admin.firestore.FieldValue.serverTimestamp(),
        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        usageCount: 1
      };

      await this.db.collection(this.cacheCollection).doc(canonicalKey).set(cacheEntry);

      // Add to in-memory cache
      this.inMemoryIndex.set(canonicalKey, cacheEntry);
      // Invalidate fuzzy cache list
      this._entriesCacheAt = 0;

      console.log(`Added to cache: '${title}' -> key: ${canonicalKey}`);
      return canonicalKey;

    } catch (error) {
      console.error('Error adding to cache:', error);
      return canonicalKey;
    }
  }

  /**
   * Get cache statistics for observability
   * @return {Promise<object>} Cache statistics
   */
  async getCacheStats() {
    try {
      const snapshot = await this.db.collection(this.cacheCollection).get();
      const entries = snapshot.docs.map(doc => doc.data());

      if (entries.length === 0) {
        return { totalEntries: 0, usageStats: {} };
      }

      const usageCounts = entries.map(entry => entry.usageCount || 0);
      const avgUsage = usageCounts.reduce((a, b) => a + b, 0) / usageCounts.length;
      const maxUsage = Math.max(...usageCounts);

      const topReused = entries
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 10)
        .map(entry => ({
          key: entry.key,
          usageCount: entry.usageCount || 0,
          examples: entry.examples || []
        }));

      return {
        totalEntries: entries.length,
        avgUsage,
        maxUsage,
        topReused
      };

    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalEntries: 0, usageStats: {} };
    }
  }
}

module.exports = EnhancedImageCache;
