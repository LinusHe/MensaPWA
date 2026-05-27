/**
 * Unit tests for EnhancedImageCache's pure normalization logic.
 * Uses Node's built-in test runner (node:test) — no test framework required.
 * Constructor is skipped via Object.create() so admin/firestore is never touched.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const EnhancedImageCache = require('../src/enhancedCache');

const cache = Object.create(EnhancedImageCache.prototype);

test('normalizeString lowercases and collapses separators', () => {
  assert.equal(
    cache.normalizeString('Spaghetti | Bolognese / Käse, Tomaten'),
    'spaghetti  bolognese  käse  tomaten'.replace(/\s+/g, ' ')
  );
});

test('normalizeString returns empty for falsy input', () => {
  assert.equal(cache.normalizeString(''), '');
  assert.equal(cache.normalizeString(null), '');
  assert.equal(cache.normalizeString(undefined), '');
});

test('cleanAndNormalizeTokens drops stopwords and short tokens', () => {
  const tokens = cache.cleanAndNormalizeTokens('spaghetti mit bolognese und käse');
  assert.deepEqual(tokens, ['spaghetti', 'bolognese', 'käse']);
});

test('cleanAndNormalizeTokens applies synonyms (frites -> pommes, chicken -> hähnchen)', () => {
  const tokens = cache.cleanAndNormalizeTokens('chicken frites');
  assert.deepEqual(tokens, ['hähnchen', 'pommes']);
});

test('cleanAndNormalizeTokens drops weight/numeric tokens', () => {
  const tokens = cache.cleanAndNormalizeTokens('hähnchen 250g 500ml extra');
  assert.deepEqual(tokens, ['hähnchen', 'extra']);
});

test('buildCanonicalKey is order-independent', () => {
  const a = cache.buildCanonicalKey('Spaghetti Bolognese mit Käse');
  const b = cache.buildCanonicalKey('Käse | Bolognese / Spaghetti');
  assert.equal(a, b);
  assert.equal(a, 'bolognese_käse_spaghetti');
});

test('buildCanonicalKey deduplicates repeated tokens', () => {
  const key = cache.buildCanonicalKey('Spaghetti Spaghetti Bolognese');
  assert.equal(key, 'bolognese_spaghetti');
});

test('buildCanonicalKey returns empty for empty input', () => {
  assert.equal(cache.buildCanonicalKey(''), '');
  assert.equal(cache.buildCanonicalKey(null), '');
});

test('buildOrderedKey preserves token order', () => {
  const key = cache.buildOrderedKey('Hähnchen Crossies mit Tomaten-Paprika-Dip');
  assert.equal(key.startsWith('hähnchen_crossies'), true);
});

test('buildOrderedKey differs from canonical when order differs', () => {
  const ordered = cache.buildOrderedKey('Pommes Salat');
  const ordered2 = cache.buildOrderedKey('Salat Pommes');
  const canonical = cache.buildCanonicalKey('Pommes Salat');
  const canonical2 = cache.buildCanonicalKey('Salat Pommes');
  assert.notEqual(ordered, ordered2);
  assert.equal(canonical, canonical2);
});

test('getCriticalTokens filters protein tokens', () => {
  const critical = cache.getCriticalTokens(['hähnchen', 'pommes', 'salat', 'käse']);
  assert.equal(critical.has('hähnchen'), true);
  assert.equal(critical.has('käse'), true);
  assert.equal(critical.has('pommes'), false);
});

test('canonical key normalizes whitespace/case/separator variants to same key', () => {
  // Both inputs use space-separated tokens (no hyphenation); should collapse
  // case, separator (&, /, ,), and "Frites" synonym to identical keys.
  const v1 = cache.buildCanonicalKey('Hähnchen Crossies mit Tomaten Paprika Dip, Steakhouse Frites');
  const v2 = cache.buildCanonicalKey('HÄHNCHEN crossies MIT tomaten&paprika dip / steakhouse pommes');
  assert.equal(v1, v2);
});

test('hyphenated tokens are kept as single tokens (documents current behavior)', () => {
  // 'Tomaten-Paprika-Dip' becomes one token; the space-separated variant
  // becomes three. Cache treats them as different — flagged so a future
  // change to split on hyphens is a conscious choice, not a regression.
  const hyphenated = cache.buildCanonicalKey('Tomaten-Paprika-Dip');
  const spaced = cache.buildCanonicalKey('Tomaten Paprika Dip');
  assert.notEqual(hyphenated, spaced);
});
