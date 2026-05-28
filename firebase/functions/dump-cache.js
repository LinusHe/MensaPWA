/**
 * One-off dump of the imagesCache Firestore collection to local JSON so we
 * can replay both the current and a proposed matching algorithm offline.
 *
 * Usage:
 *   cd firebase/functions
 *   node dump-cache.js path/to/serviceAccountKey.json
 *
 * Writes cache-dump.json next to this script. The file is gitignored.
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const saPath = process.argv[2];
if (!saPath) {
  console.error('Usage: node dump-cache.js <serviceAccountKey.json>');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(saPath))),
});

(async () => {
  const snap = await admin.firestore().collection('imagesCache').get();
  const entries = snap.docs.map((d) => {
    const e = d.data();
    return {
      key: e.key,
      storagePath: e.storagePath,
      usageCount: e.usageCount || 0,
      examples: e.examples || [],
      firstSeen: e.firstSeen && e.firstSeen.toMillis ? e.firstSeen.toMillis() : null,
      lastUsed: e.lastUsed && e.lastUsed.toMillis ? e.lastUsed.toMillis() : null,
    };
  });
  const out = path.join(__dirname, 'cache-dump.json');
  fs.writeFileSync(out, JSON.stringify(entries, null, 2));
  console.log(`Wrote ${entries.length} entries to ${out}`);
  process.exit(0);
})();
