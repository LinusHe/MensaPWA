/**
 * Unit tests for EnhancedImageCache's pure normalization + matching logic.
 * Uses Node's built-in test runner. Constructor is skipped via Object.create
 * so admin/firestore is never touched.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const EnhancedImageCache = require('../src/enhancedCache');

const cache = Object.create(EnhancedImageCache.prototype);

// --- normalizeString ------------------------------------------------------

test('normalizeString lowercases and collapses separators (incl. hyphens)', () => {
  // Hyphens count as separators now.
  const s = cache.normalizeString('Spaghetti | Bolognese / Käse-Tomaten, Senf');
  assert.equal(s, 'spaghetti bolognese käse tomaten senf');
});

test('normalizeString returns empty for falsy input', () => {
  assert.equal(cache.normalizeString(''), '');
  assert.equal(cache.normalizeString(null), '');
  assert.equal(cache.normalizeString(undefined), '');
});

// --- cleanAndNormalizeTokens ---------------------------------------------

test('cleanAndNormalizeTokens drops stopwords and short tokens', () => {
  const tokens = cache.cleanAndNormalizeTokens('spaghetti mit bolognese und käse');
  assert.deepEqual(tokens, ['spaghetti', 'bolognese', 'käse']);
});

test('cleanAndNormalizeTokens applies synonyms (frites -> pommes, chicken -> hähnchen)', () => {
  const tokens = cache.cleanAndNormalizeTokens('chicken frites');
  assert.deepEqual(tokens, ['hähnchen', 'pommes']);
});

test('cleanAndNormalizeTokens drops numeric weight tokens only when digit-prefixed', () => {
  // 250g and 500ml are dropped; "honig" (also ends in g) is NOT — fixed bug.
  const tokens = cache.cleanAndNormalizeTokens('hähnchen 250g 500ml honig');
  assert.deepEqual(tokens, ['hähnchen', 'honig']);
});

test('cleanAndNormalizeTokens drops new descriptor stopwords', () => {
  const tokens = cache.cleanAndNormalizeTokens('vegane bunte gegrillte knusprige currywurst');
  assert.deepEqual(tokens, ['currywurst']);
});

// --- buildCanonicalKey ---------------------------------------------------

test('buildCanonicalKey is order-independent', () => {
  const a = cache.buildCanonicalKey('Spaghetti Bolognese mit Käse');
  const b = cache.buildCanonicalKey('Käse | Bolognese / Spaghetti');
  assert.equal(a, b);
  assert.equal(a, 'bolognese_käse_spaghetti');
});

test('buildCanonicalKey deduplicates repeated tokens', () => {
  assert.equal(cache.buildCanonicalKey('Spaghetti Spaghetti Bolognese'), 'bolognese_spaghetti');
});

test('buildCanonicalKey returns empty for empty input', () => {
  assert.equal(cache.buildCanonicalKey(''), '');
  assert.equal(cache.buildCanonicalKey(null), '');
});

test('hyphenated and space-separated variants now collapse to same key', () => {
  // This is the inversion of an earlier test — hyphens are now separators.
  const hyphenated = cache.buildCanonicalKey('Tomaten-Paprika-Dip');
  const spaced = cache.buildCanonicalKey('Tomaten Paprika Dip');
  assert.equal(hyphenated, spaced);
});

// --- buildOrderedKey -----------------------------------------------------

test('buildOrderedKey preserves token order and deduplicates', () => {
  const key = cache.buildOrderedKey('Tomatensoße Schinken Tomatensoße Mozzarella');
  // Dedupe should drop the second tomatensoße but keep ordering.
  assert.equal(key, 'tomatensoße_schinken_mozzarella');
});

test('buildOrderedKey differs from canonical when order differs', () => {
  const ordered = cache.buildOrderedKey('Pommes Salat');
  const ordered2 = cache.buildOrderedKey('Salat Pommes');
  const canonical = cache.buildCanonicalKey('Pommes Salat');
  const canonical2 = cache.buildCanonicalKey('Salat Pommes');
  assert.notEqual(ordered, ordered2);
  assert.equal(canonical, canonical2);
});

// --- getCriticalTokens ---------------------------------------------------

test('getCriticalTokens filters protein tokens', () => {
  const critical = cache.getCriticalTokens(['hähnchen', 'pommes', 'salat', 'käse']);
  assert.equal(critical.has('hähnchen'), true);
  assert.equal(critical.has('käse'), true);
  assert.equal(critical.has('pommes'), false);
});

test('getCriticalTokens surfaces critical tokens inside compounds', () => {
  // "Hähnchenkeule" should surface hähnchen, "Seelachsfilet" should surface
  // seelachs (substring detection).
  const critical = cache.getCriticalTokens(['hähnchenkeule', 'seelachsfilet']);
  assert.equal(critical.has('hähnchen'), true);
  assert.equal(critical.has('seelachs'), true);
});

// --- buildCoreKey --------------------------------------------------------

test('buildCoreKey returns null with fewer than 2 critical tokens', () => {
  assert.equal(cache.buildCoreKey('Hähnchen mit Pommes'), null);
  assert.equal(cache.buildCoreKey('Salat'), null);
});

test('buildCoreKey returns sorted critical-token fingerprint when >=2', () => {
  const k = cache.buildCoreKey('Hähnchen mit Tofu und Brokkoli');
  assert.equal(k, 'brokkoli+hähnchen+tofu');
});

test('buildCoreKey is order-independent', () => {
  const a = cache.buildCoreKey('Tofu Hähnchen Curry');
  const b = cache.buildCoreKey('Curry Hähnchen Tofu');
  assert.equal(a, b);
});

// --- calculateSimilarity / side-dish filter ------------------------------

test('calculateSimilarity ignores side-dish tokens', () => {
  // Only the proteins should drive the score; "pommes" and "reis" are
  // filtered out. Both strings reduce to {hähnchen}, so similarity = 100.
  const sim = cache.calculateSimilarity('hähnchen pommes', 'hähnchen reis');
  assert.equal(sim, 100);
});

// --- Levenshtein helper --------------------------------------------------

test('levenshtein short-circuits when length diff exceeds limit', () => {
  // "abc" vs "abcdefghij" — diff is 7 chars, limit 2 -> returns 3 (limit+1)
  const d = EnhancedImageCache.levenshtein('abc', 'abcdefghij', 2);
  assert.ok(d > 2);
});

test('levenshtein returns exact distance for small differences', () => {
  assert.equal(EnhancedImageCache.levenshtein('brokkoli', 'brokkkoli', 2), 1);
  assert.equal(EnhancedImageCache.levenshtein('käse', 'käse', 2), 0);
});

test('levenshtein returns over-limit when distance exceeds bound', () => {
  const d = EnhancedImageCache.levenshtein('apfel', 'banane', 2);
  assert.ok(d > 2);
});

// --- End-to-end: canonical key normalizes real variants -----------------

test('canonical key collapses common cafeteria variants', () => {
  const v1 = cache.buildCanonicalKey('Hähnchen Crossies mit Tomaten Paprika Dip, Steakhouse Frites');
  const v2 = cache.buildCanonicalKey('HÄHNCHEN crossies MIT tomaten&paprika dip / steakhouse pommes');
  const v3 = cache.buildCanonicalKey('Hähnchen Crossies mit Tomaten-Paprika-Dip | Steakhouse Pommes');
  assert.equal(v1, v2);
  assert.equal(v2, v3);
});
