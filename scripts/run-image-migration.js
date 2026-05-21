/**
 * run-image-migration.js
 *
 * Migrates every old-site image URL (www.thecrosswild.com/...) onto your own
 * Cloudinary account, then updates the DB and source files to use the new URLs.
 *
 * Three phases:
 *   1. UPLOAD — for each URL in migration-combined-urls.json, ask Cloudinary
 *      to fetch + store it. Writes the {oldUrl: newUrl} mapping to
 *      migration-mapping.json after each upload (resumable).
 *   2. DB UPDATE — walk every collection + every document. Anywhere an old
 *      URL appears, replace with the new URL (using the mapping). Uses
 *      replaceOne so no field is lost.
 *   3. SOURCE FILES — for every .tsx / .js file in TheCrossWild/src/ and
 *      TheCrossWildBackend/seeds/ that contains an old URL, do a literal
 *      string replacement and write back.
 *
 * All phases are idempotent. Safe to re-run after a partial failure.
 *
 *   node scripts/run-image-migration.js
 *   node scripts/run-image-migration.js --phase=upload  (just phase 1)
 *   node scripts/run-image-migration.js --phase=db
 *   node scripts/run-image-migration.js --phase=source
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const OLD_URL_RE = /https?:\/\/(?:www\.)?thecrosswild\.com\/[^\s"'<>)`]+?\.(?:jpg|jpeg|png|webp|svg|gif|ico)/gi;

const ROOT = path.join(__dirname, '..');
const URL_LIST = path.join(ROOT, 'migration-combined-urls.json');
const MAPPING_FILE = path.join(ROOT, 'migration-mapping.json');
const LOG_FILE = path.join(ROOT, 'migration-log.txt');

function loadMapping() {
  if (fs.existsSync(MAPPING_FILE)) {
    return JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
  }
  return {};
}
function saveMapping(m) {
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(m, null, 2));
}
function log(msg) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  console.log(msg);
}

// Pick a sensible Cloudinary folder for an old URL based on its path segment.
function folderForUrl(url) {
  const m = url.match(/thecrosswild\.com\/([^\/]+)/);
  const stem = m ? m[1] : 'migrated';
  switch (stem) {
    case 'products_image': return 'crosswild/products/migrated';
    case 'upload': {
      // Look at next segment
      const sub = url.match(/upload\/([^\/]+)/);
      const k = sub ? sub[1] : 'misc';
      return `crosswild/${k}/migrated`;
    }
    case 'assets': return 'crosswild/seo/migrated';
    default: return `crosswild/migrated/${stem}`;
  }
}

function publicIdForUrl(url) {
  // Use the original filename's stem (without extension) for stability.
  const file = url.split('/').pop().replace(/\.[^.]+$/, '');
  return file;
}

// ─── PHASE 1: Upload ────────────────────────────────────────────────────────
async function phaseUpload() {
  const urls = JSON.parse(fs.readFileSync(URL_LIST, 'utf8'));
  const mapping = loadMapping();

  log(`\n═══ PHASE 1: UPLOAD ${urls.length} URLs to Cloudinary ═══`);

  const BATCH = 5;
  let done = 0, skipped = 0, failed = 0;

  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(async (oldUrl) => {
      if (mapping[oldUrl]?.newUrl) {
        return { oldUrl, skipped: true };
      }
      const folder = folderForUrl(oldUrl);
      const publicId = publicIdForUrl(oldUrl);
      const r = await cloudinary.uploader.upload(oldUrl, {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: false,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      return { oldUrl, newUrl: r.secure_url, publicId: r.public_id, format: r.format, bytes: r.bytes };
    }));

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const v = r.value;
        if (v.skipped) {
          skipped++;
        } else {
          mapping[v.oldUrl] = { newUrl: v.newUrl, publicId: v.publicId, format: v.format, bytes: v.bytes, uploadedAt: new Date().toISOString() };
          done++;
          log(`  ✓ ${v.oldUrl}\n      → ${v.newUrl}`);
        }
      } else {
        failed++;
        const oldUrl = batch[results.indexOf(r)];
        mapping[oldUrl] = { error: r.reason?.message || String(r.reason), failedAt: new Date().toISOString() };
        log(`  ✗ FAILED: ${oldUrl}\n      ${r.reason?.message}`);
      }
    }
    saveMapping(mapping);
  }

  log(`\n  Uploaded: ${done}    Skipped (already done): ${skipped}    Failed: ${failed}`);
  return { done, skipped, failed };
}

// ─── PHASE 2: DB Update ─────────────────────────────────────────────────────
function replaceUrlsInValue(value, mapping, stats) {
  if (value == null) return value;
  if (typeof value === 'string') {
    let out = value;
    const matches = value.match(OLD_URL_RE) || [];
    for (const m of matches) {
      const newUrl = mapping[m]?.newUrl;
      if (newUrl) {
        out = out.split(m).join(newUrl);
        stats.replacements++;
      } else if (!mapping[m]) {
        stats.unmapped++;
      }
    }
    return out;
  }
  if (Array.isArray(value)) {
    return value.map((v) => replaceUrlsInValue(v, mapping, stats));
  }
  if (typeof value === 'object') {
    if (value.constructor && value.constructor.name === 'ObjectId') return value;
    if (value instanceof Date) return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = replaceUrlsInValue(v, mapping, stats);
    }
    return out;
  }
  return value;
}

async function phaseDb() {
  if (!process.env.MONGODB_URI) {
    log('❌ MONGODB_URI not set');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);
  log(`\n═══ PHASE 2: DB UPDATE — connected to ${mongoose.connection.name} ═══`);

  const mapping = loadMapping();
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray()).map((c) => c.name).filter((n) => !n.startsWith('system.'));

  const summary = {};

  for (const collName of collections) {
    const coll = db.collection(collName);
    const docs = await coll.find({}).toArray();
    const stats = { docsTouched: 0, replacements: 0, unmapped: 0 };

    for (const doc of docs) {
      const newDoc = replaceUrlsInValue(doc, mapping, stats);
      // Compare by JSON serialization (skip ObjectId equality issues)
      if (JSON.stringify(newDoc) !== JSON.stringify(doc)) {
        await coll.replaceOne({ _id: doc._id }, newDoc);
        stats.docsTouched++;
      }
    }

    if (stats.replacements > 0 || stats.docsTouched > 0) {
      log(`  ${collName.padEnd(28)} ${stats.docsTouched} doc(s) updated, ${stats.replacements} URL replacement(s)${stats.unmapped ? `, ${stats.unmapped} unmapped` : ''}`);
    }
    summary[collName] = stats;
  }

  await mongoose.disconnect();
  return summary;
}

// ─── PHASE 3: Source File Rewrite ───────────────────────────────────────────
async function phaseSource() {
  log(`\n═══ PHASE 3: SOURCE FILE REWRITE ═══`);

  const mapping = loadMapping();

  // Collect every file that contains an old URL, across both repos.
  const TARGETS = [
    path.join(ROOT, '..', 'TheCrossWild', 'src'),
    path.join(ROOT, 'seeds'),
    path.join(ROOT, 'scripts'),
  ];

  function walk(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, files);
      else if (/\.(tsx?|jsx?|json|md|html|css)$/.test(entry.name)) files.push(full);
    }
    return files;
  }

  const allFiles = TARGETS.flatMap((d) => walk(d));
  let touched = 0, replacements = 0, unmapped = 0;

  for (const file of allFiles) {
    const src = fs.readFileSync(file, 'utf8');
    if (!OLD_URL_RE.test(src)) continue;
    OLD_URL_RE.lastIndex = 0; // reset regex state

    let next = src;
    const matches = src.match(OLD_URL_RE) || [];
    for (const m of matches) {
      const newUrl = mapping[m]?.newUrl;
      if (newUrl) {
        next = next.split(m).join(newUrl);
        replacements++;
      } else {
        unmapped++;
      }
    }
    if (next !== src) {
      fs.writeFileSync(file, next);
      touched++;
      log(`  ✓ ${path.relative(path.join(ROOT, '..'), file)} — ${matches.length} replacement(s)`);
    }
  }

  log(`\n  Files touched: ${touched}    Total replacements: ${replacements}    Unmapped: ${unmapped}`);
  return { touched, replacements, unmapped };
}

// ─── Main ───────────────────────────────────────────────────────────────────
(async function main() {
  fs.writeFileSync(LOG_FILE, ''); // reset
  const arg = process.argv[2] || '';
  const phase = arg.startsWith('--phase=') ? arg.split('=')[1] : 'all';

  try {
    if (phase === 'all' || phase === 'upload') await phaseUpload();
    if (phase === 'all' || phase === 'db') await phaseDb();
    if (phase === 'all' || phase === 'source') await phaseSource();
    log('\n✅ Migration complete.');
    process.exit(0);
  } catch (err) {
    log(`\n❌ FATAL: ${err.message}\n${err.stack}`);
    process.exit(1);
  }
})();
