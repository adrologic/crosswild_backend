#!/usr/bin/env node
/**
 * Copy every Cloudinary image referenced in MongoDB to Cloudflare R2, then
 * repoint the database at the new URLs.
 *
 *   • Nothing is deleted from Cloudinary. The old URLs keep working, so already
 *     indexed images and links shared on WhatsApp/Facebook never 404 while
 *     Google re-crawls. Cloudinary is also the rollback.
 *   • Images are pulled through Cloudinary's f_webp,q_auto so the optimised
 *     version is what lands in R2 — R2 is plain storage and cannot transform on
 *     delivery the way Cloudinary does.
 *   • Every change is written to a mapping file, and --rollback replays it
 *     backwards.
 *
 * Usage (run where MONGODB_URI resolves — i.e. Coolify → app → Terminal):
 *
 *   node scripts/migrate-cloudinary-to-r2.js              # dry run, changes nothing
 *   node scripts/migrate-cloudinary-to-r2.js --apply      # copy files + update the DB
 *   node scripts/migrate-cloudinary-to-r2.js --rollback <mapping.json>
 *
 * Requires, on top of MONGODB_URI:
 *   R2_BUCKET  R2_ACCOUNT_ID  R2_ACCESS_KEY_ID  R2_SECRET_ACCESS_KEY
 *   R2_PUBLIC_BASE           e.g. https://pub-xxxx.r2.dev
 *   R2_KEY_PREFIX            e.g. CrossWild
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const APPLY = process.argv.includes('--apply');
const ROLLBACK_IDX = process.argv.indexOf('--rollback');
const ROLLBACK_FILE = ROLLBACK_IDX !== -1 ? process.argv[ROLLBACK_IDX + 1] : null;
// Rehearse on a handful before committing to the whole set.
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX !== -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : null;

const CLOUDINARY_HOST = 'res.cloudinary.com';
const CONCURRENCY = 6;
const MAPPING_DIR = process.env.MAPPING_DIR || '/tmp/cloudinary-to-r2';

const die = (msg) => { console.error(`ERROR: ${msg}`); process.exit(1); };

// ── Cloudinary URL → R2 object key ───────────────────────────────────────────
//
// A delivery URL looks like:
//   https://res.cloudinary.com/<cloud>/image/upload/[transforms/]v1781348070/<public_id>.<ext>
// Transformation segments and the version are addressing, not identity, so both
// are dropped. What remains is the public_id, which is also what the `publicId`
// fields in the database hold.
function parseCloudinaryUrl(url) {
  const m = url.match(/^https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/(.+)$/);
  if (!m) return null;

  const segments = m[1].split('/');
  // Drop the version segment and anything before it — transformations only ever
  // appear ahead of the version.
  const versionAt = segments.findIndex((s) => /^v\d+$/.test(s));
  const idSegments = versionAt === -1 ? segments : segments.slice(versionAt + 1);
  if (!idSegments.length) return null;

  const withExt = idSegments.join('/');
  const publicId = withExt.replace(/\.[a-z0-9]+$/i, '');
  return { publicId };
}

function r2KeyFor(publicId) {
  const prefix = (process.env.R2_KEY_PREFIX || '').replace(/^\/+|\/+$/g, '');
  // Cloudinary already namespaces these under `crosswild/`; keeping it would
  // give CrossWild/crosswild/... in the bucket.
  const withoutVendorFolder = publicId.replace(/^crosswild\//i, '');
  return `${prefix}/${withoutVendorFolder}.webp`;
}

function webpSourceUrl(url) {
  // f_webp is explicit rather than f_auto: f_auto varies with the Accept header,
  // and a migration should not depend on what the HTTP client happens to send.
  return url.replace('/upload/', '/upload/f_webp,q_auto/');
}

// ── Walk any document shape and collect / rewrite strings ────────────────────
// The schemas nest images differently per collection (image, subImages[],
// sections[].content, banner.image …). Walking generically means a field nobody
// remembered still gets migrated.
function walkStrings(value, visit) {
  if (typeof value === 'string') return visit(value);
  if (Array.isArray(value)) {
    let changed = false;
    value.forEach((item, i) => {
      const next = walkStrings(item, visit);
      if (next !== undefined) { value[i] = next; changed = true; }
    });
    return changed ? value : undefined;
  }
  if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) {
    let changed = false;
    for (const key of Object.keys(value)) {
      const next = walkStrings(value[key], visit);
      if (next !== undefined) { value[key] = next; changed = true; }
    }
    return changed ? value : undefined;
  }
  return undefined;
}

async function eachCollection(db, fn) {
  const collections = await db.listCollections().toArray();
  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    await fn(db.collection(name), name);
  }
}

// ── Phase 1: find everything ─────────────────────────────────────────────────
async function collectReferences(db) {
  const urls = new Set();
  const publicIds = new Set();

  await eachCollection(db, async (collection) => {
    for await (const doc of collection.find({})) {
      walkStrings(doc, (str) => {
        if (str.includes(CLOUDINARY_HOST)) urls.add(str);
        return undefined;
      });
    }
  });

  // publicId fields hold the bare id, not a URL, so they need their own sweep.
  // Only ids we also saw as a URL are migrated — anything else is an orphan
  // reference and rewriting it would point at a file that was never copied.
  await eachCollection(db, async (collection) => {
    for await (const doc of collection.find({})) {
      const scan = (v) => {
        if (v && typeof v === 'object') {
          for (const [k, val] of Object.entries(v)) {
            if (k === 'publicId' && typeof val === 'string' && val) publicIds.add(val);
            else scan(val);
          }
        } else if (Array.isArray(v)) v.forEach(scan);
      };
      scan(doc);
    }
  });

  return { urls: [...urls], publicIds: [...publicIds] };
}

// ── Phase 2: copy the files ──────────────────────────────────────────────────
async function copyToR2(s3, bucket, urls) {
  const mapping = {};
  const failures = [];
  let done = 0;
  let skipped = 0;
  let bytes = 0;

  const queue = [...urls];
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      const parsed = parseCloudinaryUrl(url);
      if (!parsed) { failures.push({ url, reason: 'unrecognised Cloudinary URL' }); continue; }

      const key = r2KeyFor(parsed.publicId);
      const publicUrl = `${process.env.R2_PUBLIC_BASE.replace(/\/+$/, '')}/${key}`;

      try {
        // Already copied on an earlier run — makes the script safe to re-run.
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        mapping[url] = { key, publicUrl, publicId: parsed.publicId, skipped: true };
        skipped++;
      } catch {
        const res = await fetch(webpSourceUrl(url));
        if (!res.ok) { failures.push({ url, reason: `download ${res.status}` }); continue; }
        const body = Buffer.from(await res.arrayBuffer());

        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: 'image/webp',
          // Content-addressed by public_id and never overwritten in place, so a
          // long immutable cache is safe and keeps R2 egress near zero.
          CacheControl: 'public, max-age=31536000, immutable',
        }));

        mapping[url] = { key, publicUrl, publicId: parsed.publicId };
        bytes += body.length;
        done++;
      }

      const n = done + skipped + failures.length;
      if (n % 25 === 0) process.stdout.write(`    ${n}/${urls.length}\n`);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { mapping, failures, done, skipped, bytes };
}

// ── Phase 3: repoint the database ────────────────────────────────────────────
async function rewriteDatabase(db, replacements) {
  let docsChanged = 0;
  let fieldsChanged = 0;

  await eachCollection(db, async (collection, name) => {
    // Read the whole collection before writing any of it. Updating inside an
    // open cursor risks the cursor re-visiting or skipping documents it has
    // already yielded; these collections are small enough to hold in memory.
    const docs = await collection.find({}).toArray();
    const writes = [];

    for (const doc of docs) {
      let touched = false;
      const updated = walkStrings(doc, (str) => {
        const next = replacements.get(str);
        if (next === undefined || next === str) return undefined;
        touched = true;
        fieldsChanged++;
        return next;
      });
      if (!touched) continue;

      const { _id, ...rest } = updated;
      writes.push({ replaceOne: { filter: { _id }, replacement: rest } });
    }

    if (writes.length) {
      await collection.bulkWrite(writes, { ordered: false });
      docsChanged += writes.length;
      console.log(`    ${name}: ${writes.length} documents`);
    }
  });

  return { docsChanged, fieldsChanged };
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  if (!process.env.MONGODB_URI) die('MONGODB_URI is not set.');

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    ...(process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {}),
  });
  const db = mongoose.connection.db;
  console.log(`Connected to ${db.databaseName}\n`);

  // ── Rollback ───────────────────────────────────────────────────────────────
  if (ROLLBACK_FILE) {
    if (!fs.existsSync(ROLLBACK_FILE)) die(`Mapping file not found: ${ROLLBACK_FILE}`);
    const saved = JSON.parse(fs.readFileSync(ROLLBACK_FILE, 'utf8'));
    const reverse = new Map();
    for (const [oldUrl, info] of Object.entries(saved.mapping)) {
      reverse.set(info.publicUrl, oldUrl);
      reverse.set(info.key, info.publicId);
    }
    console.log(`Rolling back ${reverse.size / 2} images to Cloudinary…`);
    const r = await rewriteDatabase(db, reverse);
    console.log(`\nRolled back ${r.fieldsChanged} fields across ${r.docsChanged} documents.`);
    console.log('Files left in R2 — delete them from the dashboard if you want them gone.');
    await mongoose.disconnect();
    return;
  }

  // ── Discover ───────────────────────────────────────────────────────────────
  console.log('Scanning the database for Cloudinary references…');
  const found = await collectReferences(db);
  const publicIds = found.publicIds;
  const urls = LIMIT ? found.urls.slice(0, LIMIT) : found.urls;
  if (LIMIT) console.log(`  --limit ${LIMIT}: working on ${urls.length} of ${found.urls.length} images`);
  const migratablePublicIds = publicIds.filter((id) =>
    urls.some((u) => (parseCloudinaryUrl(u) || {}).publicId === id));

  console.log(`  ${urls.length} unique image URLs`);
  console.log(`  ${publicIds.length} publicId fields (${migratablePublicIds.length} match a migrating image)\n`);
  if (!urls.length) { console.log('Nothing to do.'); await mongoose.disconnect(); return; }

  if (!APPLY) {
    console.log('DRY RUN — nothing has been changed. Sample of what would happen:\n');
    for (const url of urls.slice(0, 5)) {
      const parsed = parseCloudinaryUrl(url);
      if (!parsed) { console.log(`  ?? could not parse: ${url}`); continue; }
      console.log(`  ${url}\n    → ${process.env.R2_PUBLIC_BASE.replace(/\/+$/, '')}/${r2KeyFor(parsed.publicId)}\n`);
    }
    console.log(`Re-run with --apply to copy ${urls.length} files and update the database.`);
    await mongoose.disconnect();
    return;
  }

  for (const v of ['R2_BUCKET', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_BASE', 'R2_KEY_PREFIX']) {
    if (!process.env[v]) die(`${v} is not set.`);
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // R2 requires path-style addressing
  });

  // ── Copy ───────────────────────────────────────────────────────────────────
  console.log(`Copying ${urls.length} images to R2 as WebP…`);
  const { mapping, failures, done, skipped, bytes } = await copyToR2(s3, process.env.R2_BUCKET, urls);
  console.log(`  uploaded ${done}, already present ${skipped}, failed ${failures.length}, ${(bytes / 1024 / 1024).toFixed(1)} MB transferred\n`);

  fs.mkdirSync(MAPPING_DIR, { recursive: true });
  const mappingFile = path.join(MAPPING_DIR, `mapping-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(mappingFile, JSON.stringify({ mapping, failures }, null, 2));
  console.log(`Mapping written to ${mappingFile}\n`);

  if (failures.length) {
    console.error(`${failures.length} images could not be copied — the database will NOT be updated.`);
    failures.slice(0, 10).forEach((f) => console.error(`  ${f.reason}  ${f.url}`));
    console.error('\nFix the cause and re-run; copies already made are skipped.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // ── Rewrite ────────────────────────────────────────────────────────────────
  const replacements = new Map();
  for (const [oldUrl, info] of Object.entries(mapping)) {
    replacements.set(oldUrl, info.publicUrl);
    // publicId drives deletes; point it at the R2 key so removing an image in
    // the admin removes the R2 object rather than a Cloudinary one we keep.
    replacements.set(info.publicId, info.key);
  }

  console.log('Updating the database…');
  const { docsChanged, fieldsChanged } = await rewriteDatabase(db, replacements);
  console.log(`\n✅ ${fieldsChanged} fields updated across ${docsChanged} documents.`);
  console.log(`   Rollback: node scripts/migrate-cloudinary-to-r2.js --rollback ${mappingFile}`);
  console.log('   Cloudinary is untouched — leave it in place for a few months.');

  await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
