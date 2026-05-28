/* eslint-disable indent, max-len, quotes, object-curly-spacing */
/**
 * Enhanced Image Cache for Firebase Functions
 *
 * Title normalization + multi-stage lookup. Strategy (in order):
 *  1. In-memory exact key map (per-instance cache)
 *  2. Firestore exact canonical-key match
 *  3. Fuzzy match: Jaccard similarity ≥ 65 % over non-side-dish tokens,
 *     with a critical-token-set veto
 *  4. Core-key cascade: same set of ≥ 2 critical tokens (proteins/key
 *     veggies) — for "different sides, same hero ingredient(s)"
 *  5. Levenshtein fallback: canonical key within edit distance 2 of an
 *     existing key — catches typos like "brokkkoli"
 *
 * Token normalization treats hyphens as separators (so compound dishes
 * decompose properly), filters descriptive adjectives + connectors, and
 * detects critical tokens via substring (so "Alaska-Seelachsfilet" still
 * surfaces "seelachs"). For background, see the replay analysis that
 * preceded this rewrite — it raised cache hit rate from ~5 % to ~26 %
 * on the historical corpus.
 */

const admin = require('firebase-admin');

// Connectors, descriptor adjectives, and cooking-state words that don't
// identify a dish on their own and only add noise to the canonical key.
const STOP_WORDS = new Set([
  'mit', 'und', 'oder', 'auf', 'dazu', 'vom', 'der', 'die', 'das',
  'im', 'in', 'am', 'an', 'zu', 'zum', 'zur', 'ohne', 'von',
  'bei', 'nach', 'über', 'unter', 'gegen', 'durch', 'für',
  'aus', 'alternativ', 'wahl', 'optional',
  'frisch', 'frische', 'frischer', 'frisches', 'frischen',
  'hausgemacht', 'hausgemachte', 'hausgemachter', 'hausgemachten',
  'selbstgemacht', 'selbstgemachte',
  'lecker', 'köstlich', 'fein', 'zart',
  'knusprig', 'knuspriges', 'knusprige', 'knuspriger', 'knusprigen',
  'cremig', 'würzig', 'aromatisch', 'feurig', 'feuriger', 'feurige', 'feuriges',
  'gebraten', 'gebratene', 'gebratener', 'gebratenen', 'gebratenes',
  'gegrillt', 'gegrillte', 'gegrillter', 'gegrillten', 'gegrilltes',
  'gebacken', 'gebackene', 'gebackener',
  'überbacken', 'überbackene',
  'paniert', 'panierte', 'panierter',
  'vegan', 'vegane', 'veganer', 'veganes', 'veganem', 'veganen',
  'vegetarisch', 'vegetarische', 'vegetarischer', 'vegetarisches',
  'bunt', 'bunte', 'bunter', 'buntes', 'bunten',
]);

// Tokens to normalize variant spellings / synonymous words.
const SYNONYMS = {
  'pommes': 'pommes', 'chips': 'pommes', 'frites': 'pommes',
  'rustico': 'pommes', 'kartoffeltwister': 'pommes',
  'steakhouse': 'pommes', 'wedges': 'pommes',

  'joghurt': 'joghurt', 'yoghurt': 'joghurt',

  'rapunsel': 'rapunzel', 'paprica': 'paprika',
  'brokkkoli': 'brokkoli',  // recurring typo in upstream data

  'hähnchen': 'hähnchen', 'huhn': 'hähnchen', 'chicken': 'hähnchen',
  'schwein': 'schwein', 'schweine': 'schwein', 'pork': 'schwein',
  'rind': 'rind', 'rindfleisch': 'rind', 'beef': 'rind',
  'pute': 'pute', 'truthahn': 'pute', 'turkey': 'pute',

  'fisch': 'fisch', 'seelachs': 'seelachs', 'lachs': 'lachs',
  'thunfisch': 'thunfisch', 'forelle': 'forelle',

  'käse': 'käse', 'mozzarella': 'mozzarella', 'gouda': 'gouda',
  'frischkäse': 'frischkäse', 'parmesan': 'parmesan',

  'tofu': 'tofu', 'tempeh': 'tempeh', 'seitan': 'seitan',

  'reis': 'reis', 'jasminreis': 'reis', 'basmatireis': 'reis',
  'vollkornreis': 'vollkornreis', 'wildreis': 'wildreis',
  'quinoa': 'quinoa', 'bulgur': 'bulgur', 'couscous': 'couscous',

  'nudeln': 'nudeln', 'spaghetti': 'spaghetti', 'penne': 'penne',
  'schupfnudeln': 'schupfnudeln', 'gnocchi': 'gnocchi',

  'brokkoli': 'brokkoli', 'blumenkohl': 'blumenkohl',
  'spinat': 'spinat', 'blattspinat': 'spinat',
  'paprika': 'paprika', 'tomaten': 'tomaten',
  'zwiebeln': 'zwiebeln', 'möhren': 'möhren', 'karotten': 'möhren',
};

// "Hero" tokens: identity of a dish lives here. Used for veto on fuzzy
// matches and as the fingerprint of the core-key cascade.
const CRITICAL_TOKENS = new Set([
  'hähnchen', 'schwein', 'rind', 'pute', 'fisch', 'seelachs', 'lachs',
  'thunfisch', 'forelle', 'tofu', 'käse', 'mozzarella', 'frischkäse',
  'spinat', 'brokkoli', 'blumenkohl', 'curry', 'chili', 'thai',
]);

// Tokens we don't want to count toward fuzzy similarity (they don't
// identify a dish — almost every plate has one of these).
const SIDE_DISH = new Set([
  'pommes', 'reis', 'kartoffeln', 'salzkartoffeln', 'bratkartoffeln',
  'kartoffel', 'kartoffelpüree', 'püree', 'salat', 'salatmix', 'mixsalat',
  'brot', 'fladenbrot', 'pita', 'baguette', 'gemüse', 'nudeln', 'spätzle',
  'eierspätzle', 'soße', 'sauce', 'dip', 'dips', 'beilage',
  'glasnudeln', 'couscous', 'bulgur', 'quinoa', 'gnocchi',
  'vollkornreis', 'wildreis',
]);

const FUZZY_THRESHOLD = 65;
const FUZZY_CRITICAL_BONUS = 5;
const LEVENSHTEIN_MAX = 2;
const CORE_MIN_CRITICAL = 2;
const ENTRIES_TTL_MS = 60 * 1000;

class EnhancedImageCache {
  constructor() {
    this.db = admin.firestore();
    this.cacheCollection = 'imagesCache';
    this.inMemoryIndex = new Map();
    this._entriesCache = null;
    this._entriesCacheAt = 0;
  }

  // ----------------------------------------------------------------------
  // Token pipeline
  // ----------------------------------------------------------------------

  /**
   * Step 1 — lowercase, replace separators with spaces, strip stray quotes,
   * collapse whitespace.
   * @param {string} text
   * @return {string}
   */
  normalizeString(text) {
    if (!text) return '';
    let s = text.toLowerCase();
    // Hyphens count as separators so compound dishes decompose.
    s = s.replace(/[|/&,\-–—]+/g, ' ');
    s = s.replace(/["""„«»]/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  /**
   * Step 2 — turn the normalized string into clean tokens (stopwords +
   * synonyms applied, weight indicators dropped, residual hyphens stripped).
   * @param {string} normalizedString
   * @return {Array<string>}
   */
  cleanAndNormalizeTokens(normalizedString) {
    const rawTokens = normalizedString.split(' ');
    const out = [];
    for (let token of rawTokens) {
      token = token.replace(/\([^)]*\)/g, '');
      token = token.replace(/"[^"]*"/g, '');
      token = token.replace(/[^\w\-äöüß]/g, '');
      token = token.replace(/^-+|-+$/g, '');
      if (!token) continue;

      // Weight indicators only count as such when preceded by a digit
      // ("250g" yes, "honig" no).
      if (/^\d+$/.test(token) || /\d+(g|ml|kg|l)$/.test(token)) continue;

      if (SYNONYMS[token]) token = SYNONYMS[token];
      if (STOP_WORDS.has(token)) continue;
      if (token.length > 1) out.push(token);
    }
    return out;
  }

  /**
   * Sorted + deduplicated canonical key (order-independent identity).
   * @param {string} title
   * @return {string}
   */
  buildCanonicalKey(title) {
    if (!title) return '';
    const tokens = this.cleanAndNormalizeTokens(this.normalizeString(title));
    if (tokens.length === 0) return '';
    return [...new Set(tokens)].sort().join('_');
  }

  /**
   * Order-preserving + deduplicated key. Used for cache filenames.
   * @param {string} title
   * @return {string}
   */
  buildOrderedKey(title) {
    if (!title) return '';
    const tokens = this.cleanAndNormalizeTokens(this.normalizeString(title));
    if (tokens.length === 0) return '';
    const seen = new Set();
    const out = [];
    for (const t of tokens) {
      if (!seen.has(t)) { seen.add(t); out.push(t); }
    }
    return out.join('_');
  }

  // ----------------------------------------------------------------------
  // Critical-token detection (with substring lookup for compounds)
  // ----------------------------------------------------------------------

  /**
   * Find critical tokens, including those embedded inside compound words
   * ("Alaska-Seelachsfilet" surfaces "seelachs", "Hähnchenkeule" surfaces
   * "hähnchen").
   * @param {Iterable<string>} tokens
   * @return {Set<string>}
   */
  getCriticalTokens(tokens) {
    const found = new Set();
    for (const tok of tokens) {
      if (CRITICAL_TOKENS.has(tok)) { found.add(tok); continue; }
      for (const crit of CRITICAL_TOKENS) {
        if (tok.includes(crit)) { found.add(crit); break; }
      }
    }
    return found;
  }

  /**
   * Core fingerprint: only critical tokens, requires at least
   * {@link CORE_MIN_CRITICAL} so single-protein dishes don't collapse onto
   * unrelated single-protein cache entries.
   * @param {string} title
   * @return {string|null}
   */
  buildCoreKey(title) {
    if (!title) return null;
    const tokens = this.cleanAndNormalizeTokens(this.normalizeString(title));
    const crit = this.getCriticalTokens(tokens);
    if (crit.size < CORE_MIN_CRITICAL) return null;
    return [...crit].sort().join('+');
  }

  // ----------------------------------------------------------------------
  // Similarity scoring
  // ----------------------------------------------------------------------

  /**
   * Jaccard over non-side-dish tokens. Side dishes are dropped so
   * "Hähnchen + Pommes" doesn't appear more similar to "Hähnchen + Reis"
   * just because both have a generic carb token.
   */
  calculateSimilarity(str1, str2) {
    const filt = (s) => new Set(s.split(' ').filter((t) => t && !SIDE_DISH.has(t)));
    const t1 = filt(str1);
    const t2 = filt(str2);
    if (t1.size === 0 && t2.size === 0) return 0;
    const intersection = new Set([...t1].filter((x) => t2.has(x)));
    const union = new Set([...t1, ...t2]);
    return (intersection.size / union.size) * 100;
  }

  /**
   * Walk existing entries and return the best fuzzy candidate's key, or
   * null. Veto: critical-token sets must be identical.
   */
  findFuzzyMatch(canonicalKey, tokens, existingEntries) {
    if (!canonicalKey) return null;
    const currentCritical = this.getCriticalTokens(tokens);
    const currentTokenString = [...tokens].sort().join(' ');

    let bestMatch = null;
    let bestScore = 0;

    for (const entry of existingEntries) {
      const existingTokens = entry.key.split('_');
      const existingCritical = this.getCriticalTokens(existingTokens);

      if (currentCritical.size !== existingCritical.size ||
          ![...currentCritical].every((t) => existingCritical.has(t))) continue;

      const existingTokenString = [...existingTokens].sort().join(' ');
      let similarity = this.calculateSimilarity(currentTokenString, existingTokenString);
      if (currentCritical.size > 0) similarity += FUZZY_CRITICAL_BONUS;

      if (similarity >= FUZZY_THRESHOLD && similarity > bestScore) {
        bestScore = similarity;
        bestMatch = entry.key;
      }
    }

    if (bestMatch) {
      console.log(`Fuzzy match: '${canonicalKey}' -> '${bestMatch}' (score: ${bestScore.toFixed(1)})`);
    }
    return bestMatch;
  }

  /**
   * Bounded Levenshtein distance — short-circuits when difference in
   * string length already exceeds the limit.
   */
  static levenshtein(a, b, limit) {
    if (a === b) return 0;
    if (!a.length) return b.length <= limit ? b.length : limit + 1;
    if (!b.length) return a.length <= limit ? a.length : limit + 1;
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    const prev = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      let prevDiag = prev[0];
      prev[0] = i;
      let rowMin = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = prev[j];
        prev[j] = a[i - 1] === b[j - 1]
          ? prevDiag
          : 1 + Math.min(prevDiag, prev[j - 1], prev[j]);
        prevDiag = tmp;
        if (prev[j] < rowMin) rowMin = prev[j];
      }
      if (rowMin > limit) return limit + 1;
    }
    return prev[b.length];
  }

  // ----------------------------------------------------------------------
  // Firestore-backed cache operations
  // ----------------------------------------------------------------------

  /**
   * Load all entries from Firestore with a short TTL so the fuzzy + core +
   * Levenshtein passes don't hammer the DB per lookup.
   */
  async _loadEntries() {
    const now = Date.now();
    if (this._entriesCache && (now - this._entriesCacheAt) < ENTRIES_TTL_MS) {
      return this._entriesCache;
    }
    const snapshot = await this.db.collection(this.cacheCollection).get();
    const entries = snapshot.docs.map((doc) => ({ key: doc.id, ...doc.data() }));
    // Pre-compute core keys once per refresh.
    const coreIndex = new Map();
    for (const entry of entries) {
      const tokens = entry.key.split('_');
      const crit = this.getCriticalTokens(tokens);
      if (crit.size >= CORE_MIN_CRITICAL) {
        const ck = [...crit].sort().join('+');
        if (!coreIndex.has(ck)) coreIndex.set(ck, entry.key);
      }
    }
    this._entriesCache = entries;
    this._entriesCacheAt = now;
    this._coreIndex = coreIndex;
    return entries;
  }

  async _hit(docRef, title, matchType) {
    await docRef.update({
      usageCount: admin.firestore.FieldValue.increment(1),
      examples: admin.firestore.FieldValue.arrayUnion(title),
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
    });
    const entry = (await docRef.get()).data();
    return { filename: entry.storagePath, matchType };
  }

  async getCachedImage(title) {
    const canonicalKey = this.buildCanonicalKey(title);
    if (!canonicalKey) return null;

    // 1. In-memory exact
    if (this.inMemoryIndex.has(canonicalKey)) {
      const entry = this.inMemoryIndex.get(canonicalKey);
      console.log(`In-memory cache hit: '${title}' -> ${entry.storagePath}`);
      return { filename: entry.storagePath, matchType: 'exact' };
    }

    try {
      // 2. Firestore exact
      const docRef = this.db.collection(this.cacheCollection).doc(canonicalKey);
      const doc = await docRef.get();
      if (doc.exists) {
        const entry = doc.data();
        await docRef.update({
          usageCount: admin.firestore.FieldValue.increment(1),
          examples: admin.firestore.FieldValue.arrayUnion(title),
          lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        });
        this.inMemoryIndex.set(canonicalKey, entry);
        console.log(`Exact cache hit: '${title}' -> ${entry.storagePath}`);
        return { filename: entry.storagePath, matchType: 'exact' };
      }

      const tokens = this.cleanAndNormalizeTokens(this.normalizeString(title));
      const entries = await this._loadEntries();

      // 3. Fuzzy
      const fuzzyKey = this.findFuzzyMatch(canonicalKey, tokens, entries);
      if (fuzzyKey) {
        const fuzzyDoc = await this.db.collection(this.cacheCollection).doc(fuzzyKey).get();
        if (fuzzyDoc.exists) {
          const result = await this._hit(fuzzyDoc.ref, title, 'fuzzy');
          console.log(`Fuzzy cache hit: '${title}' -> ${result.filename}`);
          return result;
        }
      }

      // 4. Core-key cascade (≥2 critical tokens)
      const coreKey = this.buildCoreKey(title);
      if (coreKey && this._coreIndex && this._coreIndex.has(coreKey)) {
        const coreEntryKey = this._coreIndex.get(coreKey);
        const coreDoc = await this.db.collection(this.cacheCollection).doc(coreEntryKey).get();
        if (coreDoc.exists) {
          const result = await this._hit(coreDoc.ref, title, 'core');
          console.log(`Core cache hit: '${title}' -> ${result.filename} (core: ${coreKey})`);
          return result;
        }
      }

      // 5. Levenshtein typo tolerance on canonical key
      let bestLev = null;
      let bestDist = LEVENSHTEIN_MAX + 1;
      for (const entry of entries) {
        const d = EnhancedImageCache.levenshtein(canonicalKey, entry.key, LEVENSHTEIN_MAX);
        if (d < bestDist) {
          bestDist = d;
          bestLev = entry.key;
          if (d === 1) break; // good enough
        }
      }
      if (bestLev) {
        const levDoc = await this.db.collection(this.cacheCollection).doc(bestLev).get();
        if (levDoc.exists) {
          const result = await this._hit(levDoc.ref, title, 'lev');
          console.log(`Levenshtein cache hit (dist=${bestDist}): '${title}' -> ${result.filename}`);
          return result;
        }
      }

      console.log(`No cache match found for: '${title}' (key: ${canonicalKey})`);
      return null;

    } catch (error) {
      console.error('Error checking cache:', error);
      return null;
    }
  }

  async addToCache(title, storagePath) {
    let canonicalKey = this.buildCanonicalKey(title);
    if (!canonicalKey) {
      canonicalKey = title.toLowerCase().replace(/[^\w\-äöüß]/g, '_');
    }
    try {
      const cacheEntry = {
        key: canonicalKey,
        storagePath,
        examples: [title],
        firstSeen: admin.firestore.FieldValue.serverTimestamp(),
        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        usageCount: 1,
      };
      await this.db.collection(this.cacheCollection).doc(canonicalKey).set(cacheEntry);
      this.inMemoryIndex.set(canonicalKey, cacheEntry);
      this._entriesCacheAt = 0;  // invalidate fuzzy + core caches
      console.log(`Added to cache: '${title}' -> key: ${canonicalKey}`);
      return canonicalKey;
    } catch (error) {
      console.error('Error adding to cache:', error);
      return canonicalKey;
    }
  }

  async getCacheStats() {
    try {
      const snapshot = await this.db.collection(this.cacheCollection).get();
      const entries = snapshot.docs.map((doc) => doc.data());
      if (entries.length === 0) return { totalEntries: 0, usageStats: {} };
      const usageCounts = entries.map((e) => e.usageCount || 0);
      const avgUsage = usageCounts.reduce((a, b) => a + b, 0) / usageCounts.length;
      const maxUsage = Math.max(...usageCounts);
      const topReused = entries
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 10)
        .map((entry) => ({
          key: entry.key,
          usageCount: entry.usageCount || 0,
          examples: entry.examples || [],
        }));
      return { totalEntries: entries.length, avgUsage, maxUsage, topReused };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalEntries: 0, usageStats: {} };
    }
  }
}

module.exports = EnhancedImageCache;
