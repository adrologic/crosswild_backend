/**
 * Clean up `title` field for all products.
 *
 * Transformation rules (from user example):
 *   "Cricket Sun Hat Manufacturer — Bulk Bright-Colour Sports Hats India"
 *   → "Cricket Sun Hat / Bright-Colour Sports Hats India"
 *
 *   1. Replace em-dash ("—") with " / " (slash with surrounding spaces).
 *      Same for "--".
 *   2. Strip commercial-suffix fluff tokens (case-insensitive, word-bounded):
 *        Manufacturer, Supplier, Bulk, Wholesale
 *      from anywhere in the string.
 *   3. Collapse repeated whitespace, trim, remove trailing punctuation.
 *   4. Skip if no em-dash AND no banned tokens present (already clean).
 *
 * The write is exactly:
 *   updateOne({ _id }, { $set: { title } }, { timestamps: false })
 *
 * Dry run:  node scripts/cleanProductTitles.js --dry-run   (default)
 * Apply:    node scripts/cleanProductTitles.js --apply
 *
 * Optional scope: --scope=tshirts-caps   (default: all products)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

// case-insensitive; only the commercial-suffix fluff that the user wants gone
const BANNED = [
  'manufacturer',
  'supplier',
  'bulk',
  'wholesale',
];

// stop words that are meaningless if left orphaned at the end of a segment
// (e.g. "...Polos in Bulk" — strip "Bulk" then the trailing "in" must go too)
const TRAILING_STOP_WORDS = [
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into',
  'of', 'on', 'or', 'the', 'to', 'with', 'via',
];

function escapeRegex(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function containsBanned(s) {
  if (!s) return false;
  return BANNED.some(b => new RegExp(`\\b${escapeRegex(b)}\\b`, 'i').test(s));
}

function stripBanned(s) {
  let out = s;
  for (const b of BANNED) {
    out = out.replace(new RegExp(`\\s*\\b${escapeRegex(b)}\\b\\s*`, 'gi'), ' ');
  }
  return out;
}

// Strip orphan trailing stop words from each "/"-separated segment.
// e.g. "Tournament Team Polos in" → "Tournament Team Polos"
function stripTrailingStopWords(s) {
  return s
    .split('/')
    .map(seg => {
      let words = seg.trim().split(/\s+/).filter(Boolean);
      while (
        words.length > 0 &&
        TRAILING_STOP_WORDS.includes(words[words.length - 1].toLowerCase())
      ) {
        words.pop();
      }
      return words.join(' ');
    })
    .join(' / ');
}

function isAlreadyClean(s) {
  if (!s) return true;
  if (s.includes('—') || s.includes('--')) return false;
  if (containsBanned(s)) return false;
  return true;
}

function computeNewTitle(oldTitle) {
  if (!oldTitle) return { skip: true, reason: 'empty' };
  const original = oldTitle.trim();

  if (isAlreadyClean(original)) {
    return { skip: true, reason: 'already clean' };
  }

  // Rule 1: replace em-dash and double-hyphen with " / "
  let s = original.replace(/\s*—\s*/g, ' / ').replace(/\s+--\s+/g, ' / ');

  // Rule 2: strip banned tokens
  s = stripBanned(s);

  // Rule 3: collapse whitespace, trim, fix spacing around " / ", remove
  // trailing punctuation, drop any stray leading / trailing slashes.
  s = s.replace(/\s+/g, ' ').trim();
  // collapse double-slash if banned-word strip left an empty segment
  s = s.replace(/(\s*\/\s*){2,}/g, ' / ');
  // drop a leading or trailing " / "
  s = s.replace(/^\s*\/\s*/, '').replace(/\s*\/\s*$/, '');
  // strip orphan trailing stop words per "/"-segment ("...Polos in" → "...Polos")
  s = stripTrailingStopWords(s);
  // remove trailing punctuation
  s = s.replace(/[:\-—,;]+$/g, '').trim();

  if (s === original) {
    return { skip: true, reason: 'no change after cleanup' };
  }

  if (s.length === 0) {
    return { flag: true, newTitle: s, reason: 'cleanup produced empty string' };
  }

  return { newTitle: s };
}

async function main() {
  const isApply = process.argv.includes('--apply');
  const scopeArg = process.argv.find(a => a.startsWith('--scope='));
  const scope = scopeArg ? scopeArg.split('=')[1] : 'all';
  const query = scope === 'tshirts-caps'
    ? { category: { $in: ['tshirts', 'caps'] } }
    : {};

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');
  console.log(`Scope: ${scope === 'all' ? 'ALL products' : 'tshirts + caps only'}\n`);

  const products = await Product.find(query).lean();

  const toUpdate = [];
  const skipped = [];
  const flagged = [];

  for (const p of products) {
    const r = computeNewTitle(p.title);
    if (r.skip) {
      skipped.push({ _id: p._id, category: p.category, title: p.title, reason: r.reason });
    } else if (r.flag) {
      flagged.push({ _id: p._id, category: p.category, oldTitle: p.title, newTitle: r.newTitle, reason: r.reason });
    } else {
      toUpdate.push({ _id: p._id, category: p.category, oldTitle: p.title, newTitle: r.newTitle });
    }
  }

  if (toUpdate.length) {
    console.log('=== Will Update ===');
    for (const u of toUpdate) {
      const idShort = String(u._id).slice(-6);
      console.log(`[${u.category}] ${idShort}`);
      console.log(`   OLD: "${u.oldTitle}"`);
      console.log(`   NEW: "${u.newTitle}"`);
    }
    console.log();
  }

  if (flagged.length) {
    console.log('=== Needs Manual Review (NOT auto-applied) ===');
    for (const f of flagged) {
      const idShort = String(f._id).slice(-6);
      console.log(`[${f.category}] ${idShort}   (${f.reason})`);
      console.log(`   OLD: "${f.oldTitle}"`);
      console.log(`   NEW: "${f.newTitle}"`);
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
      const r = await Product.updateOne(
        { _id: u._id },
        { $set: { title: u.newTitle } },
        { timestamps: false }
      );
      if (r.matchedCount === 1) {
        console.log(`✓ updated ${u._id}  →  "${u.newTitle}"`);
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
    'name', 'slug', 'sku', 'description', 'tagline', 'shortDescription',
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
    console.log(`  title: "${before.title}"`);
    console.log(`      →  "${aft.title}"`);
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
    console.log(allOk ? `  → all non-title fields preserved ✓` : `  → DIFFERENCES DETECTED ✗`);
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB.\n');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
