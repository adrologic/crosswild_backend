/**
 * Clean up `name` field for tshirts + caps products.
 *
 * ONLY the `name` field changes. The write is exactly:
 *   updateOne({ _id }, { $set: { name } }, { timestamps: false })
 *
 * Dry run:  node scripts/cleanProductNames.js --dry-run   (default)
 * Apply:    node scripts/cleanProductNames.js --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

// case-insensitive; multi-word entries are matched as adjacent phrases
const BANNED = [
  'manufacturer',
  'supplier',
  'bulk',
  'wholesale',
  'custom printed',
  'custom embroidered',
  'india',
  'jaipur',
  'best',
  'top',
  'leading',
  'best-selling',
  'premium-grade',
  'b2b',
];

// tokens kept verbatim during title-casing
const PRESERVE = ['T-Shirt', 'V-Neck', '5-Panel', '6-Panel', '3D', 'DTF', 'GSM', '&'];

// prepositions / articles / conjunctions that stay lowercase in title-case,
// except when they are the first word. Keeps natural English title casing
// and avoids "only with → With" no-op diffs.
const LOWERCASE_STOP_WORDS = [
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into',
  'of', 'on', 'or', 'the', 'to', 'with', 'via', 'over', 'per', 'vs',
];

function escapeRegex(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function containsBanned(s) {
  if (!s) return false;
  const lower = s.toLowerCase();
  return BANNED.some(b => new RegExp(`\\b${escapeRegex(b)}\\b`, 'i').test(lower));
}

function stripBanned(s) {
  let out = s;
  for (const b of BANNED) {
    out = out.replace(new RegExp(`\\s*\\b${escapeRegex(b)}\\b\\s*`, 'gi'), ' ');
  }
  return out;
}

function titleCasePreserving(s) {
  const words = s.split(/\s+/).filter(w => w.length > 0);
  return words
    .map((token, i) => {
      const presWhole = PRESERVE.find(p => p.toLowerCase() === token.toLowerCase());
      if (presWhole) return presWhole;
      // stop words stay lowercase unless they're the first word
      if (i > 0 && LOWERCASE_STOP_WORDS.includes(token.toLowerCase())) {
        return token.toLowerCase();
      }
      return token
        .split('-')
        .map(part => {
          if (part.length === 0) return part;
          const presPart = PRESERVE.find(p => p.toLowerCase() === part.toLowerCase());
          if (presPart) return presPart;
          return part[0].toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('-');
    })
    .join(' ');
}

function isAlreadyClean(s) {
  if (!s) return false;
  const wordCount = s.trim().split(/\s+/).length;
  if (wordCount > 6) return false;
  if (s.includes('—') || s.includes('--')) return false;
  if (containsBanned(s)) return false;
  return true;
}

function computeNewName(oldName) {
  if (!oldName) return { skip: true, reason: 'empty' };
  const original = oldName.trim();

  if (isAlreadyClean(original)) {
    return { skip: true, reason: 'already clean' };
  }

  let s = original;

  // Rule 1: split on em-dash or double hyphen
  let halves = null;
  if (s.includes('—')) halves = s.split('—').map(x => x.trim()).filter(Boolean);
  else if (s.includes('--')) halves = s.split('--').map(x => x.trim()).filter(Boolean);

  if (halves && halves.length === 2) {
    const [left, right] = halves;
    const leftBad = containsBanned(left);
    const rightBad = containsBanned(right);
    if (!leftBad && rightBad) s = left;
    else if (leftBad && !rightBad) s = right;
    else if (leftBad && rightBad) s = stripBanned(right);
    else s = left; // both clean: keep LEFT (preserves the product identity)
  } else if (halves && halves.length > 2) {
    // multiple em-dashes: keep the longest clean piece, else strip-and-keep the last
    const clean = halves.filter(h => !containsBanned(h));
    if (clean.length) s = clean.sort((a, b) => b.length - a.length)[0];
    else s = stripBanned(halves[halves.length - 1]);
  }

  // Rule 2: strip remaining banned tokens
  s = stripBanned(s);

  // Rule 3: collapse whitespace, trim, strip trailing punctuation
  s = s.replace(/\s+/g, ' ').trim().replace(/[:\-—,]+$/g, '').trim();

  // Rule 4: title-case preserving listed tokens
  s = titleCasePreserving(s);

  // Rule 5: word-count gate
  const wordCount = s.split(/\s+/).filter(x => x.length > 0).length;
  if (wordCount < 2 || wordCount > 8) {
    return { flag: true, newName: s, reason: `word count ${wordCount} outside [2,8]` };
  }

  if (s === original) {
    return { skip: true, reason: 'no change after cleanup' };
  }

  return { newName: s };
}

async function main() {
  const isApply = process.argv.includes('--apply');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  // Scope: --scope=tshirts-caps to limit; default is ALL products.
  const scopeArg = process.argv.find(a => a.startsWith('--scope='));
  const scope = scopeArg ? scopeArg.split('=')[1] : 'all';
  const query = scope === 'tshirts-caps'
    ? { category: { $in: ['tshirts', 'caps'] } }
    : {};
  console.log(`Scope: ${scope === 'all' ? 'ALL products' : 'tshirts + caps only'}\n`);
  const products = await Product.find(query).lean();

  const toUpdate = [];
  const skipped = [];
  const flagged = [];

  for (const p of products) {
    const r = computeNewName(p.name);
    if (r.skip) {
      skipped.push({ _id: p._id, category: p.category, name: p.name, reason: r.reason });
    } else if (r.flag) {
      flagged.push({ _id: p._id, category: p.category, oldName: p.name, newName: r.newName, reason: r.reason });
    } else {
      toUpdate.push({ _id: p._id, category: p.category, oldName: p.name, newName: r.newName });
    }
  }

  // print proposed updates
  if (toUpdate.length) {
    console.log('=== Will Update ===');
    for (const u of toUpdate) {
      const idShort = String(u._id).slice(-6);
      console.log(`[${u.category}] ${idShort}`);
      console.log(`   OLD: "${u.oldName}"`);
      console.log(`   NEW: "${u.newName}"`);
    }
    console.log();
  }

  // flagged
  if (flagged.length) {
    console.log('=== Needs Manual Review (NOT auto-applied) ===');
    for (const f of flagged) {
      const idShort = String(f._id).slice(-6);
      console.log(`[${f.category}] ${idShort}   (${f.reason})`);
      console.log(`   OLD: "${f.oldName}"`);
      console.log(`   NEW: "${f.newName}"`);
    }
    console.log();
  }

  console.log(`Total scanned: ${products.length}`);
  console.log(`Will update:   ${toUpdate.length}`);
  console.log(`Skipped (already clean): ${skipped.length}`);
  console.log(`Needs manual review (flagged): ${flagged.length}`);

  if (!isApply) {
    console.log('\n--dry-run mode (default). No writes performed. Re-run with --apply to perform updates.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (!toUpdate.length) {
    console.log('\nNothing to apply.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ---- APPLY MODE ----------------------------------------------------
  // pick up to 2 random samples and snapshot ALL fields BEFORE the writes
  const sampleCount = Math.min(2, toUpdate.length);
  const sampleIdx = [];
  while (sampleIdx.length < sampleCount) {
    const i = Math.floor(Math.random() * toUpdate.length);
    if (!sampleIdx.includes(i)) sampleIdx.push(i);
  }
  const sampleIds = sampleIdx.map(i => toUpdate[i]._id);
  const snapshotsBefore = await Promise.all(sampleIds.map(id => Product.findById(id).lean()));

  console.log('\n=== Applying updates ===');
  let updated = 0;
  let failed = 0;
  const failures = [];
  for (const u of toUpdate) {
    try {
      // The exact operation requested — only `name` is set, timestamps preserved.
      const r = await Product.updateOne(
        { _id: u._id },
        { $set: { name: u.newName } },
        { timestamps: false }
      );
      if (r.matchedCount === 1) {
        console.log(`✓ updated ${u._id}  →  "${u.newName}"`);
        updated++;
      } else {
        console.log(`? ${u._id} matchedCount=${r.matchedCount} modifiedCount=${r.modifiedCount}`);
        failed++;
        failures.push({ _id: u._id, reason: `unexpected match/modify (${r.matchedCount}/${r.modifiedCount})` });
      }
    } catch (e) {
      console.log(`✗ FAILED ${u._id}: ${e.message}`);
      failed++;
      failures.push({ _id: u._id, reason: e.message });
    }
  }

  console.log(`\nUpdated: ${updated}`);
  console.log(`Failed:  ${failed}`);
  if (failures.length) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f._id} :: ${f.reason}`);
  }

  // ---- VERIFY 2 SAMPLES ---------------------------------------------
  console.log('\n=== Post-Apply Verification (sample docs) ===');
  const after = await Promise.all(sampleIds.map(id => Product.findById(id).lean()));
  const FIELDS_TO_CHECK = [
    'title', 'slug', 'sku', 'description', 'tagline', 'shortDescription',
    'sections', 'productCategories', 'category', 'sizes', 'colors',
    'image', 'imagePublicId', 'imageTrackingCode', 'subImages',
    'seo', 'isActive', 'bestSeller', 'newArrival', 'featured', 'trending',
    'mostPopular', 'rating', 'reviews', 'details', 'customFields',
    'price', 'stock', 'minOrderQuantity', 'productType', 'createdAt', 'updatedAt',
  ];

  for (let i = 0; i < after.length; i++) {
    const before = snapshotsBefore[i];
    const aft = after[i];
    console.log(`\nSample: ${aft._id}`);
    console.log(`  name: "${before.name}"`);
    console.log(`     →  "${aft.name}"`);
    let allOk = true;
    for (const f of FIELDS_TO_CHECK) {
      const beforeVal = JSON.stringify(before[f]);
      const afterVal = JSON.stringify(aft[f]);
      if (beforeVal === afterVal) {
        console.log(`  field ${f.padEnd(20)} unchanged: ✓`);
      } else {
        console.log(`  field ${f.padEnd(20)} CHANGED!`);
        console.log(`    before: ${beforeVal}`);
        console.log(`    after : ${afterVal}`);
        allOk = false;
      }
    }
    console.log(allOk ? `  → all non-name fields preserved ✓` : `  → DIFFERENCES DETECTED ✗`);
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB.\n');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
