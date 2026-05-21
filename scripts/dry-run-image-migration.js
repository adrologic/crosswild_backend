/**
 * dry-run-image-migration.js
 *
 * READ-ONLY. Walks every collection in MongoDB and reports every URL that points
 * at the old-site domain (thecrosswild.com). Does not write anything.
 *
 *   node scripts/dry-run-image-migration.js
 *
 * Output:
 *   - Console summary
 *   - migration-inventory.json (full list of {collection, _id, field, url})
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// We deliberately use the raw driver (not Mongoose models) so we discover URLs
// inside fields we haven't modelled — including raw HTML inside descriptions.
const OLD_URL_RE = /https?:\/\/(?:www\.)?thecrosswild\.com\/[^\s"'<>)]+\.(?:jpg|jpeg|png|webp|svg|gif|ico)/gi;

function findUrls(value, currentPath, hits, ctx) {
  if (value == null) return;
  if (typeof value === 'string') {
    const matches = value.match(OLD_URL_RE);
    if (matches) {
      for (const m of matches) {
        hits.push({ collection: ctx.collection, _id: ctx._id, field: currentPath, url: m });
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => findUrls(v, `${currentPath}[${i}]`, hits, ctx));
    return;
  }
  if (typeof value === 'object' && value !== null) {
    // Skip Mongo internals
    if (value.constructor && value.constructor.name === 'ObjectId') return;
    if (value instanceof Date) return;
    for (const [k, v] of Object.entries(value)) {
      if (k === '_id' || k === '__v') continue;
      findUrls(v, currentPath ? `${currentPath}.${k}` : k, hits, ctx);
    }
  }
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);

  const db = mongoose.connection.db;
  const allCollections = (await db.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.'));

  console.log(`📋 Scanning ${allCollections.length} collections: ${allCollections.join(', ')}\n`);

  const hits = [];
  const perCollection = {};

  for (const coll of allCollections) {
    const docs = await db.collection(coll).find({}, { projection: { __v: 0 } }).toArray();
    const collHits = [];
    for (const doc of docs) {
      findUrls(doc, '', collHits, { collection: coll, _id: doc._id?.toString() });
    }
    perCollection[coll] = { totalDocs: docs.length, urlHits: collHits.length, uniqueUrls: new Set(collHits.map((h) => h.url)).size };
    hits.push(...collHits);
  }

  await mongoose.disconnect();

  // Build a unique-URL-only summary
  const urlMap = new Map();
  for (const h of hits) {
    if (!urlMap.has(h.url)) urlMap.set(h.url, []);
    urlMap.get(h.url).push({ collection: h.collection, _id: h._id, field: h.field });
  }
  const uniqueUrls = [...urlMap.keys()].sort();

  // ── Output ───────────────────────────────────────────────────────────────
  console.log('═════════════════════════════════════════════════════════════');
  console.log('  PER-COLLECTION HITS');
  console.log('═════════════════════════════════════════════════════════════');
  for (const [coll, stats] of Object.entries(perCollection)) {
    if (stats.urlHits === 0) {
      console.log(`  ${coll.padEnd(30)} —  no old-site URLs`);
    } else {
      console.log(`  ${coll.padEnd(30)} ${String(stats.urlHits).padStart(4)} url-hits  (${stats.uniqueUrls} unique, across ${stats.totalDocs} docs)`);
    }
  }

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('  TOP URL HOSTS / PREFIXES IN DB');
  console.log('═════════════════════════════════════════════════════════════');
  const prefixCount = {};
  for (const url of uniqueUrls) {
    const stem = url.replace(/https?:\/\/(?:www\.)?thecrosswild\.com\//, '').split('/')[0];
    prefixCount[stem] = (prefixCount[stem] || 0) + 1;
  }
  for (const [stem, n] of Object.entries(prefixCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${stem.padEnd(20)} ${n} URL(s)`);
  }

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('  FIELD BREAKDOWN (where in the schema the URLs live)');
  console.log('═════════════════════════════════════════════════════════════');
  const fieldCount = {};
  for (const h of hits) {
    const key = `${h.collection}.${h.field.replace(/\[\d+\]/g, '[]')}`;
    fieldCount[key] = (fieldCount[key] || 0) + 1;
  }
  for (const [field, n] of Object.entries(fieldCount).sort((a, b) => b[1] - a[1]).slice(0, 30)) {
    console.log(`  ${String(n).padStart(4)}  ${field}`);
  }

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('  TOTALS');
  console.log('═════════════════════════════════════════════════════════════');
  console.log(`  ${hits.length} total old-site URL occurrences in DB`);
  console.log(`  ${uniqueUrls.length} unique old-site URLs in DB`);

  // ── Write JSON inventory ─────────────────────────────────────────────────
  const inventoryPath = path.join(__dirname, '..', 'migration-inventory.json');
  fs.writeFileSync(inventoryPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totals: { occurrences: hits.length, uniqueUrls: uniqueUrls.length },
    perCollection,
    fieldCount,
    uniqueUrls,
    hits,
  }, null, 2));
  console.log(`\n📄 Full inventory written to: migration-inventory.json`);

  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Scan failed:', err);
  process.exit(1);
});
