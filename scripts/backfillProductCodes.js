/**
 * One-shot backfill: give every existing product a public CW#### code.
 *
 *   node scripts/backfillProductCodes.js            # dry run (default, no writes)
 *   node scripts/backfillProductCodes.js --apply    # actually write
 *
 * What --apply does, in order:
 *   1. drops the legacy non-unique `sku_1` index if present (index only — no
 *      document is read, changed or removed by this step)
 *   2. creates the unique partial index `sku_unique`
 *   3. issues a code to every product that has none
 *
 * The index is created BEFORE any code is assigned on purpose: it is what makes
 * the assignment safe. Codes are generated then written, and a duplicate-key
 * error just costs one wasted attempt — no check-then-insert race.
 *
 * Safe to re-run: products that already have a code are never touched.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const {
  PRODUCT_CODE_INDEX,
  LEGACY_SKU_INDEX,
  PRODUCT_CODE_DIGITS,
  generateProductCode,
  ensureProductCode,
} = require('../utils/productCode');

const APPLY = process.argv.includes('--apply');
// Swap the indexes but assign no codes. Used before a bulk import: the unique
// index has to exist first so it can arbitrate the codes the import generates.
const INDEXES_ONLY = process.argv.includes('--indexes-only');
const CODE_SPACE = 10 ** PRODUCT_CODE_DIGITS;

// Products with no usable code yet: '', null, or the field missing entirely.
const MISSING_CODE = { $or: [{ sku: { $in: ['', null] } }, { sku: { $exists: false } }] };

async function connect() {
  if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI is not set (expected in TheCrossWildBackend/.env).');
    process.exit(1);
  }
  // Mirrors config/database.js: MONGODB_DB wins over whatever database the URI
  // names. Without it a URI ending in ":27017/?" silently lands in `test`,
  // where every query returns empty and the backfill looks like a no-op.
  const dbName = process.env.MONGODB_DB;
  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    // Mongoose would otherwise build the model's declared indexes on first use
    // — a write, during what may be a dry run, and one that fails while the
    // legacy sku_1 index is still there. This script manages indexes itself.
    autoIndex: false,
    ...(dbName ? { dbName } : {}),
  });
  console.log(`Connected to ${conn.connection.host} — database: ${conn.connection.name}\n`);
}

async function describeIndexes() {
  const indexes = await Product.collection.indexes();
  const legacy = indexes.find((i) => i.name === LEGACY_SKU_INDEX);
  const unique = indexes.find((i) => i.name === PRODUCT_CODE_INDEX);
  return { indexes, legacy, unique };
}

async function run() {
  await connect();

  const total = await Product.countDocuments({});
  const missing = await Product.countDocuments(MISSING_CODE);
  const have = total - missing;
  const { legacy, unique } = await describeIndexes();

  console.log(`Products:            ${total}`);
  console.log(`  already coded:     ${have}`);
  console.log(`  needing a code:    ${missing}`);
  console.log(`Code space:          ${CODE_SPACE} (CW${'#'.repeat(PRODUCT_CODE_DIGITS)})`);
  console.log(`Index ${LEGACY_SKU_INDEX}:        ${legacy ? 'present — will be dropped' : 'absent'}`);
  console.log(`Index ${PRODUCT_CODE_INDEX}:   ${unique ? 'present' : 'absent — will be created'}\n`);

  // Duplicates would block the unique index. Report them instead of failing
  // mid-build with an opaque driver error.
  const dupes = await Product.aggregate([
    { $match: { sku: { $gt: '' } } },
    { $group: { _id: '$sku', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  if (dupes.length > 0) {
    console.error(`BLOCKED: ${dupes.length} code(s) are already used by more than one product:`);
    dupes.forEach((d) => console.error(`  ${d._id} × ${d.count}  (${d.ids.join(', ')})`));
    console.error('\nResolve these by hand before creating the unique index. Nothing was changed.');
    await mongoose.disconnect();
    process.exit(1);
  }

  if (missing > CODE_SPACE - have) {
    console.error(
      `BLOCKED: ${missing} products need a code but only ${CODE_SPACE - have} remain in the ` +
      `CW${'#'.repeat(PRODUCT_CODE_DIGITS)} space. Widen the format in utils/productCode.js first.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!APPLY) {
    const sample = await Product.find(MISSING_CODE).select('name').limit(5).lean();
    if (sample.length > 0) {
      console.log('Sample of what would be issued (codes are drawn fresh at write time):');
      sample.forEach((p) => console.log(`  ${generateProductCode()}  ${p.name}`));
      if (missing > sample.length) console.log(`  … and ${missing - sample.length} more`);
    }
    console.log('\nDRY RUN — nothing was written. Re-run with --apply to write.');
    await mongoose.disconnect();
    return;
  }

  // ── 1. drop the legacy index ────────────────────────────────────────────
  // MongoDB refuses two indexes on the same key that differ only in options,
  // so the old non-unique `sku_1` has to go before `sku_unique` can be built.
  if (legacy) {
    await Product.collection.dropIndex(LEGACY_SKU_INDEX);
    console.log(`Dropped index ${LEGACY_SKU_INDEX}.`);
  }

  // ── 2. create the unique partial index ──────────────────────────────────
  if (!unique) {
    await Product.collection.createIndex(
      { sku: 1 },
      { unique: true, name: PRODUCT_CODE_INDEX, partialFilterExpression: { sku: { $gt: '' } } }
    );
    console.log(`Created index ${PRODUCT_CODE_INDEX} (unique, partial on sku > '').`);
  }

  // ── 3. issue codes ──────────────────────────────────────────────────────
  if (INDEXES_ONLY) {
    console.log('\n--indexes-only: the unique index is in place; no codes were issued.');
    await mongoose.disconnect();
    return;
  }

  const targets = await Product.find(MISSING_CODE).select('_id name').lean();
  let issued = 0;
  let skipped = 0;
  for (const p of targets) {
    const code = await ensureProductCode(Product, p._id);
    if (code) {
      issued++;
      if (issued <= 10 || issued % 50 === 0) console.log(`  ${code}  ${p.name}`);
    } else {
      skipped++;
    }
  }

  const stillMissing = await Product.countDocuments(MISSING_CODE);
  const distinct = (await Product.distinct('sku', { sku: { $gt: '' } })).length;
  const coded = await Product.countDocuments({ sku: { $gt: '' } });

  console.log(`\nIssued ${issued} code(s)${skipped ? `, skipped ${skipped}` : ''}.`);
  console.log(`Products with a code: ${coded} (${distinct} distinct — must match)`);
  console.log(`Products still without one: ${stillMissing}`);
  if (stillMissing === 0 && coded === distinct && coded === total) {
    console.log('\nOK — every product has a unique code.');
  } else {
    console.log('\nCheck the numbers above before deploying.');
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('\nFAILED:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
