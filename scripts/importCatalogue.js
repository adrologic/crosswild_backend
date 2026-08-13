/**
 * Import the finished 133-product catalogue into the LIVE database.
 *
 *   node scripts/importCatalogue.js --host 217.216.59.240:27417
 *   node scripts/importCatalogue.js --host 217.216.59.240:27417 --apply
 *
 * The products were already built and their 591 photos already uploaded to
 * Cloudinary, so this only copies documents — no images move, nothing is
 * re-uploaded, and the run takes seconds rather than an hour.
 *
 * Reads credentials from .env.production (the Coolify database), NOT .env
 * (the old Atlas copy). The URI there names a Docker-internal host that only
 * resolves inside the server, so --host swaps in whatever endpoint you can
 * actually reach: Coolify's temporary public port, or an SSH tunnel.
 *
 * THE LIVE-DATABASE CHECK
 * -----------------------
 * Both databases are called "thecrosswild" and both contain the same 94
 * products, so a name check proves nothing — that is exactly how an earlier run
 * of this work went into the wrong one. Instead this script asks the website
 * what it is serving (/api/products/version) and refuses to write unless the
 * database it just connected to produces the same signature. A database that
 * disagrees with the live site is not the live database.
 *
 * Everything is imported HIDDEN. Publishing is a separate step
 * (switchCatalogue.js), so the live site does not change here at all.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });
const fs = require('fs');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { PRODUCT_CODE_INDEX } = require('../utils/productCode');

const EXPORT_PATH = path.join(__dirname, 'new-catalogue-133.json');

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : null;
};
const APPLY = process.argv.includes('--apply');
const HOST_OVERRIDE = arg('--host');
const VERIFY_URL = arg('--verify-url') || 'http://localhost:3000/api/products/version';
const SKIP_VERIFY = process.argv.includes('--skip-live-check');

/** Swap the Docker-internal host for one reachable from here. */
function withHost(uri, hostPort) {
  if (!hostPort) return uri;
  return uri.replace(/@[^/?]+/, `@${hostPort}`);
}

/**
 * JSON has no ObjectId and no Date, so a document round-tripped through a file
 * comes back with a string _id and string timestamps. Inserted as-is they look
 * fine in the collection but break every query that casts to ObjectId —
 * findById, $in on _id, populate — and every sort on a date.
 */
function reviveTypes(doc) {
  const out = { ...doc };
  if (typeof out._id === 'string') out._id = new mongoose.Types.ObjectId(out._id);
  for (const field of ['createdAt', 'updatedAt']) {
    if (typeof out[field] === 'string') out[field] = new Date(out[field]);
  }
  return out;
}

async function run() {
  if (!fs.existsSync(EXPORT_PATH)) {
    console.error(`FATAL: ${EXPORT_PATH} not found — run the export first.`);
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI is not set in .env.production');
    process.exit(1);
  }

  const uri = withHost(process.env.MONGODB_URI, HOST_OVERRIDE);
  const shown = uri.replace(/\/\/([^:]+):[^@]+@/, '//$1:****@');
  console.log(`Connecting to: ${shown}`);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20000,
    autoIndex: false,
    ...(process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {}),
  });
  console.log(`Connected     : host ${conn.connection.host}  database ${conn.connection.name}\n`);

  // ── is this actually the database the website reads? ───────────────────
  const activeCount = await Product.countDocuments({ isActive: true });
  const latest = await Product.findOne({ isActive: true }).sort({ updatedAt: -1 }).select('updatedAt').lean();
  const localSig = `${activeCount}:${latest?.updatedAt ? new Date(latest.updatedAt).getTime() : 0}`;

  if (SKIP_VERIFY) {
    console.log(`Live-site check: SKIPPED (--skip-live-check). This database reports ${localSig}.`);
  } else {
    let siteSig = null;
    try {
      const res = await fetch(VERIFY_URL, { signal: AbortSignal.timeout(20000) });
      if (res.ok) siteSig = (await res.json()).version;
    } catch (e) {
      console.error(`Could not reach ${VERIFY_URL} — ${e.message}`);
    }
    if (!siteSig) {
      console.error(
        `\nBLOCKED: could not ask the website what it is serving.\n` +
        `  Start the site locally (npm run dev in TheCrossWild) so ${VERIFY_URL}\n` +
        `  answers, point --verify-url at the live backend, or pass --skip-live-check\n` +
        `  if you are certain this is the right database.`
      );
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log(`Website serves : ${siteSig}`);
    console.log(`This database  : ${localSig}`);
    if (siteSig !== localSig) {
      console.error(
        `\nBLOCKED: they do not match, so this is NOT the database the website reads.\n` +
        `  Writing here would have no effect on the live site — which is exactly the\n` +
        `  mistake this check exists to prevent. Check --host and .env.production.`
      );
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log('Match — this is the live database.\n');
  }

  // ── load and check the payload ─────────────────────────────────────────
  const payload = JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf8'));
  const products = payload.products.map(reviveTypes);
  const ids = products.map((p) => p._id);

  // Clean up any earlier run of this script that inserted string _ids.
  const stringIds = products.map((p) => String(p._id));
  const brokenCount = await Product.collection.countDocuments({ _id: { $in: stringIds } });
  if (brokenCount > 0) {
    if (!APPLY) {
      console.log(`\n${brokenCount} document(s) from a previous run have a string _id and will be replaced.`);
    } else {
      const del = await Product.collection.deleteMany({ _id: { $in: stringIds } });
      console.log(`\nRemoved ${del.deletedCount} document(s) with a string _id from a previous run.`);
    }
  }

  const already = await Product.find({ _id: { $in: ids } }).select('_id').lean();
  const toInsert = products.filter((p) => !already.some((a) => String(a._id) === String(p._id)));

  const slugClash = await Product.find({
    slug: { $in: toInsert.map((p) => p.slug) },
    _id: { $nin: ids },
  }).select('slug').lean();
  const nameClash = await Product.find({
    name: { $in: toInsert.map((p) => p.name) },
    _id: { $nin: ids },
  }).select('name').lean();
  const skuClash = await Product.find({
    sku: { $in: toInsert.map((p) => p.sku) },
    _id: { $nin: ids },
  }).select('sku').lean();

  console.log(`Products in export     : ${products.length}`);
  console.log(`Already in this database: ${already.length}`);
  console.log(`To insert              : ${toInsert.length}`);
  console.log(`Page-address clashes   : ${slugClash.length}`);
  console.log(`Name clashes           : ${nameClash.length}`);
  console.log(`Product-code clashes   : ${skuClash.length}`);
  console.log(`Currently live here    : ${activeCount}`);

  if (slugClash.length || nameClash.length || skuClash.length) {
    console.error('\nBLOCKED — resolve the clashes above first. Nothing was written.');
    [...slugClash, ...nameClash, ...skuClash].slice(0, 10).forEach((c) => console.error(`  ${JSON.stringify(c)}`));
    await mongoose.disconnect();
    process.exit(1);
  }

  // Everything arrives hidden; publishing is switchCatalogue.js's job.
  toInsert.forEach((p) => {
    p.isActive = false;
  });

  if (!APPLY) {
    console.log('\nWould insert, first five:');
    toInsert.slice(0, 5).forEach((p) => console.log(`  ${p.sku}  ${p.name}`));
    console.log('\nDRY RUN — nothing was written. Re-run with --apply.');
    await mongoose.disconnect();
    return;
  }

  // The unique code index must exist here too, or codes are unenforced.
  const indexes = await Product.collection.indexes();
  if (indexes.some((i) => i.name === 'sku_1')) {
    await Product.collection.dropIndex('sku_1');
    console.log('\nDropped the old non-unique sku index.');
  }
  if (!indexes.some((i) => i.name === PRODUCT_CODE_INDEX)) {
    await Product.collection.createIndex(
      { sku: 1 },
      { unique: true, name: PRODUCT_CODE_INDEX, partialFilterExpression: { sku: { $gt: '' } } }
    );
    console.log(`Created ${PRODUCT_CODE_INDEX} (unique).`);
  }

  if (toInsert.length) {
    const res = await Product.collection.insertMany(toInsert, { ordered: false });
    console.log(`\nInserted ${res.insertedCount} products (all hidden).`);
  } else {
    console.log('\nNothing to insert — already present.');
  }

  const live = await Product.countDocuments({ isActive: true });
  const hidden = await Product.countDocuments({ isActive: false });
  const coded = await Product.countDocuments({ sku: { $gt: '' } });
  console.log(`\nLive   : ${live}   (unchanged — the website looks the same)`);
  console.log(`Hidden : ${hidden}`);
  console.log(`Coded  : ${coded}`);
  console.log('\nNext: node scripts/switchCatalogue.js --host <same host>   (dry run first)');

  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('\nFATAL:', e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
