/* eslint-disable indent, max-len, quotes, object-curly-spacing */
/**
 * Decide whether a dish renders as one plate or several, based on its
 * category — informed by 90 days of upstream data.
 *
 * Returns:
 *   { atoms: string[] }   normal case — array of atom strings to render
 *   { skip: true }        skip image generation entirely (Smoothie)
 *
 * Empirical patterns:
 *
 *   - **Pastateller, Sättigungsbeilage, Gemüsebeilage** are categories
 *     that don't describe one cohesive plate — they describe a list of
 *     options the student picks one of (different pastas, different
 *     carbs, different vegetable sides). Every `|`-segment here is an
 *     alternative; compositing as overlapping plates communicates this.
 *
 *   - **Smoothie** is replaced by a static collage in the PWA, so no
 *     image needs to be generated at all.
 *
 *   - **All other categories** describe one main dish plus its sides /
 *     toppings / sauces — even when the side is written as a bare noun
 *     ("Vegane Currywurst mit feuriger Soße | Pommes frites" is still
 *     one plate, not two). Render as a single plate, full title as one
 *     prompt.
 *
 * Inline "oder X" alternatives are folded back into the previous atom
 * with parens so the prompt notes the substitution without spawning a
 * separate plate.
 */

const MULTI_PLATE_CATEGORIES = new Set([
  'Pastateller',
  'Sättigungsbeilage',
  'Gemüsebeilage',
]);

const SKIP_CATEGORIES = new Set([
  'Smoothie',
]);

function splitSegments(title) {
  return String(title)
    .replace(/\s+/g, ' ')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

function foldOderAlternatives(segments) {
  const out = [];
  for (const seg of segments) {
    if (/^oder\s+/i.test(seg) && out.length > 0) {
      out[out.length - 1] += ` (oder ${seg.replace(/^oder\s+/i, '')})`;
    } else {
      out.push(seg);
    }
  }
  return out;
}

function atomize(title, category) {
  if (!title) return { atoms: [] };
  if (SKIP_CATEGORIES.has(category)) return { skip: true };
  if (!MULTI_PLATE_CATEGORIES.has(category)) return { atoms: [title] };
  const atoms = foldOderAlternatives(splitSegments(title));
  return { atoms: atoms.length > 0 ? atoms : [title] };
}

module.exports = { atomize, MULTI_PLATE_CATEGORIES, SKIP_CATEGORIES };
