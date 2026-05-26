/**
 * Standalone local test for image generation.
 * Runs the same path as the scheduled function but skips Firestore/Storage
 * and writes the result to disk for visual inspection.
 *
 * Usage:
 *   cd firebase/functions
 *   node test-image-gen.js "Spaghetti Bolognese" vegetarian
 */

const fs = require('fs');
const path = require('path');

// Minimal .env loader (avoid adding dotenv as a runtime dep)
for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  if (!(key in process.env)) process.env[key] = value;
}

const { _internal } = require('./src/dataGeneration');

async function main() {
  const title = process.argv[2] || 'Spaghetti Bolognese';
  const selections = process.argv.slice(3);

  const dish = {
    title,
    category: 'Hauptgericht',
    selections,
  };

  console.log('Model:', process.env.OPENAI_IMAGE_MODEL);
  console.log('Size :', process.env.OPENAI_IMAGE_SIZE);
  console.log('Quality:', process.env.OPENAI_IMAGE_QUALITY);
  console.log('Dish :', dish);
  console.log('Prompt:\n' + _internal.buildImagePromptFromDish(dish) + '\n');

  const buf = await _internal.generateDishImage(dish);

  const outDir = path.join(__dirname, 'test-output');
  fs.mkdirSync(outDir, { recursive: true });
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const outPath = path.join(outDir, `${Date.now()}-${slug}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`\nWrote ${outPath} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
