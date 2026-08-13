/**
 * STEP 3 — upload the rebuilt catalogue as HIDDEN products.
 *
 *   node scripts/uploadCatalogue.js                 # dry run (default, no writes)
 *   node scripts/uploadCatalogue.js --apply         # upload for real
 *   node scripts/uploadCatalogue.js --apply --only p001,p042
 *
 * Reads the copy written in step 2 and the folder manifest, then for each
 * product uploads its photos and creates ONE hidden product document.
 *
 * Everything it creates is invisible on the website: isActive=false. The
 * products currently live are never read for modification, changed or deleted.
 *
 * Images
 * ------
 * The source folder is 3.75 GB — a median photo is 5.7 MB and 54 of them exceed
 * Cloudinary's 10 MB limit. Each photo is resized locally before it is sent,
 * which is also what makes the site usable on a slow connection:
 *
 *   full   max 1600px, q82   -> uploaded, used on the product page
 *   thumb  max  500px        -> NOT uploaded; a Cloudinary URL transform of the
 *                               same asset, so grids cost one upload, not two
 *   blur   20px, base64      -> ~1KB stored in the database and rendered
 *                               instantly while the real photo loads
 *
 * Safety
 * ------
 * Preflight aborts before a single byte is uploaded unless: the unique
 * product-code index exists, the storage driver is one whose URLs support the
 * thumbnail transform, every sub-category resolves to a real Category id, the
 * manifest matches what is actually on disk, and no product name collides.
 *
 * A product is all-or-nothing. If any one of its photos fails after retries the
 * whole product is abandoned and reported as FAILED, rather than being created
 * with photos missing — a short product looks successful forever and re-running
 * would skip it.
 *
 * Resumable: finished products are recorded in scripts/.upload-progress.json, so
 * a dropped connection costs only the product in flight. Images uploaded for a
 * product that then failed are recorded under `pending` with their publicIds, so
 * nothing is orphaned without a trace.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const sharp = require('sharp');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { uploadToImgBB } = require('../utils/imgbbUpload');
const { saveWithProductCode, PRODUCT_CODE_INDEX } = require('../utils/productCode');

const SOURCE_DIR = '/Users/adrologic/Movies/Crosswild /CROSSWILD Products';
const COPY_DIR = '/private/tmp/claude-502/-Users-adrologic-Movies-Crosswild-/f11ffea9-f900-4d54-8f86-6d2752508d3c/scratchpad/copy';
const AUDIT_PATH = path.join(__dirname, 'product-image-audit.json');
const PROGRESS_PATH = path.join(__dirname, '.upload-progress.json');

const APPLY = process.argv.includes('--apply');
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg !== -1 ? process.argv[onlyArg + 1].split(',').map((s) => s.trim()) : null;

const FULL_MAX = 1600;
const THUMB_WIDTH = 500;
const PAUSE_MS = 350;
const UPLOAD_ATTEMPTS = 3;
const ABORT_AFTER_CONSECUTIVE_FAILURES = 3;

const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const isJpg = (f) => /\.jpe?g$/i.test(f) && !f.startsWith('.');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cloudinary renders transforms from the stored asset, so the small version
 *  costs no extra upload — it is the same URL with a transform segment added. */
function deriveThumbUrl(url) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return null;
  return url.replace('/upload/', `/upload/w_${THUMB_WIDTH},c_limit,q_auto,f_auto/`);
}

async function makeBlur(file) {
  const buf = await sharp(file).resize(20, 20, { fit: 'inside' }).jpeg({ quality: 45 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function makeUploadable(file) {
  return sharp(file)
    .rotate() // honour EXIF orientation before it is stripped
    .resize(FULL_MAX, FULL_MAX, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

/** Upload one photo, retrying a flaky connection before giving up. */
async function uploadOne(file, category) {
  const buffer = await makeUploadable(file);
  const dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;

  let lastError;
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt++) {
    try {
      const res = await uploadToImgBB(dataUri, 'base64', category);
      return {
        url: res.url,
        thumbUrl: deriveThumbUrl(res.url) || res.url,
        blurData: await makeBlur(file),
        trackingCode: res.trackingCode,
        publicId: res.publicId,
        bytes: buffer.length,
      };
    } catch (e) {
      lastError = e;
      if (attempt < UPLOAD_ATTEMPTS) {
        console.log(`        retry ${attempt}/${UPLOAD_ATTEMPTS - 1} for ${path.basename(file)} — ${e.message}`);
        await sleep(1500 * attempt);
      }
    }
  }
  throw new Error(`${path.basename(file)}: ${lastError.message}`);
}

function buildSeo(p, category) {
  return {
    title: p.title.slice(0, 120),
    description: p.shortDescription.slice(0, 300),
    keywords: [p.name, p.productKind, category, 'custom', 'bulk order', 'Jaipur'].filter(Boolean),
    ogImage: '',
    canonicalUrl: '',
    otherMetaTags: '',
    noIndex: false,
    noFollow: false,
  };
}

const loadProgress = () => {
  if (!fs.existsSync(PROGRESS_PATH)) return { done: {}, pending: {} };
  try {
    const p = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    return { done: p.done || {}, pending: p.pending || {} };
  } catch {
    return { done: {}, pending: {} };
  }
};
const saveProgress = (p) => fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 1));

function die(message) {
  console.error(`\nPREFLIGHT FAILED\n${message}\n\nNothing was uploaded.`);
  process.exitCode = 1;
}

async function run() {
  const copy = JSON.parse(fs.readFileSync(path.join(COPY_DIR, 'written.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(COPY_DIR, 'manifest.json'), 'utf8'));
  const metaById = new Map(manifest.map((m) => [m.id, m]));

  if (!process.env.MONGODB_URI) return die('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: false,
    ...(process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {}),
  });

  const problems = [];

  // ── preflight 1: the unique product-code index must arbitrate ───────────
  // 133 random codes in a 10,000-wide space collide with better than even odds,
  // so without this index duplicates are likely, not theoretical.
  const indexes = await Product.collection.indexes();
  if (!indexes.some((i) => i.name === PRODUCT_CODE_INDEX)) {
    problems.push(
      `The unique product-code index "${PRODUCT_CODE_INDEX}" does not exist.\n` +
      `  Fix: node scripts/backfillProductCodes.js --apply --indexes-only`
    );
  }

  // ── preflight 2: the thumbnail trick only works on Cloudinary URLs ──────
  if (process.env.STORAGE_DRIVER === 'r2') {
    problems.push(
      `STORAGE_DRIVER=r2, but the small image is produced by a Cloudinary URL\n` +
      `  transform. On R2 every imageThumb would silently be the full-size photo.\n` +
      `  Fix: unset STORAGE_DRIVER for this import, or add a real R2 thumbnail upload.`
    );
  }

  // ── preflight 3: every sub-category must be a real Category id ──────────
  // Products are filtered by Category.id, which is NOT always the same string as
  // Category.seoUrl (e.g. id "corduroy-caps" has seoUrl "corduroy-fabric-caps").
  // A product tagged with the seoUrl never appears on its own category page.
  const categories = await Category.find({}).select('id seoUrl name').lean();
  const idSet = new Set(categories.map((c) => c.id));
  const seoUrlToId = new Map(categories.filter((c) => c.seoUrl).map((c) => [c.seoUrl, c.id]));
  const subFixes = [];
  for (const c of copy) {
    if (idSet.has(c.sub)) continue;
    const mapped = seoUrlToId.get(c.sub);
    if (mapped) {
      subFixes.push({ id: c.id, was: c.sub, now: mapped });
      c.sub = mapped;
    } else {
      problems.push(`${c.id}: sub-category "${c.sub}" matches no Category id or seoUrl.`);
    }
  }

  // ── preflight 4: the manifest must still match what is on disk ──────────
  const audit = fs.existsSync(AUDIT_PATH) ? JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8')) : null;
  const intentionallySkipped = new Set(
    (audit?.groups || []).filter((g) => g.status === 'duplicate-folder').map((g) => g.dir)
  );
  const onDisk = [];
  for (const srcFolder of fs.readdirSync(SOURCE_DIR, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const abs = path.join(SOURCE_DIR, srcFolder.name);
    for (const d of fs.readdirSync(abs, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const rel = path.join(srcFolder.name, d.name);
      if (fs.readdirSync(path.join(abs, d.name)).some(isJpg)) onDisk.push(rel);
    }
  }
  const mapped = new Set(manifest.map((m) => m.dir));
  const unaccounted = onDisk.filter((d) => !mapped.has(d) && !intentionallySkipped.has(d));
  if (unaccounted.length) {
    problems.push(
      `${unaccounted.length} folder(s) on disk are in neither the manifest nor the\n` +
      `  known duplicates: ${unaccounted.slice(0, 5).join(', ')}${unaccounted.length > 5 ? ' …' : ''}`
    );
  }
  for (const m of manifest) {
    const abs = path.join(SOURCE_DIR, m.dir);
    if (!fs.existsSync(abs)) {
      problems.push(`${m.id}: folder no longer exists — ${m.dir}`);
      continue;
    }
    const count = fs.readdirSync(abs).filter(isJpg).length;
    if (count !== m.imageCount) {
      problems.push(`${m.id}: folder now has ${count} photos, manifest says ${m.imageCount} — ${m.dir}`);
    }
  }

  // ── preflight 5: names must be unique, here and in the database ─────────
  const seen = new Map();
  for (const c of copy) {
    const key = c.name.trim().toLowerCase();
    if (seen.has(key)) problems.push(`${c.id}: duplicate name "${c.name}" (also ${seen.get(key)})`);
    else seen.set(key, c.id);
  }
  const existing = await Product.find({ name: { $in: copy.map((c) => c.name) } }).select('name').lean();
  if (existing.length) {
    problems.push(
      `${existing.length} product name(s) already exist in the database and would be skipped:\n` +
      `  ${existing.slice(0, 5).map((e) => e.name).join(', ')}${existing.length > 5 ? ' …' : ''}`
    );
  }

  let items = copy.filter((c) => metaById.has(c.id));
  if (ONLY) items = items.filter((c) => ONLY.includes(c.id));

  const totalImages = items.reduce((n, c) => n + metaById.get(c.id).imageCount, 0);
  console.log(`Storage driver     : ${process.env.STORAGE_DRIVER === 'r2' ? 'Cloudflare R2' : 'Cloudinary'}`);
  console.log(`Products to create : ${items.length}`);
  console.log(`Images to upload   : ${totalImages}`);
  console.log(`Mode               : ${APPLY ? 'APPLY — will write' : 'DRY RUN — no writes'}`);
  console.log(`Visibility         : hidden (isActive=false)`);
  if (subFixes.length) {
    console.log(`\nSub-category fixed (seoUrl -> Category id) for ${subFixes.length} product(s):`);
    subFixes.forEach((f) => console.log(`  ${f.id}  ${f.was} -> ${f.now}`));
  }
  if (intentionallySkipped.size) {
    console.log(`\nSkipping ${intentionallySkipped.size} folder(s) that are byte-identical copies of another folder.`);
  }

  if (problems.length) {
    await mongoose.disconnect();
    return die(problems.map((p) => `  • ${p}`).join('\n'));
  }
  console.log('\nPreflight passed.\n');

  if (!APPLY) {
    for (const c of items.slice(0, 5)) {
      const m = metaById.get(c.id);
      console.log(`  ${c.id}  ${c.name}`);
      console.log(`        ${m.category} / ${c.sub}   ${m.imageCount} images from ${m.dir}`);
    }
    if (items.length > 5) console.log(`  … and ${items.length - 5} more`);
    console.log('\nDRY RUN — nothing was uploaded or written. Re-run with --apply.');
    await mongoose.disconnect();
    return;
  }

  const progress = loadProgress();
  let created = 0;
  let skipped = 0;
  let failed = 0;
  let uploadedBytes = 0;
  let consecutiveFailures = 0;

  for (let i = 0; i < items.length; i++) {
    const c = items[i];
    const m = metaById.get(c.id);
    const tag = `[${String(i + 1).padStart(3)}/${items.length}] ${c.id}`;

    if (progress.done[c.id]) {
      skipped++;
      continue;
    }

    const clash = await Product.findOne({ name: c.name }).select('_id').lean();
    if (clash) {
      console.log(`${tag} SKIP — a product named "${c.name}" already exists (${clash._id})`);
      progress.done[c.id] = { productId: String(clash._id), skipped: true };
      saveProgress(progress);
      skipped++;
      continue;
    }

    const absDir = path.join(SOURCE_DIR, m.dir);
    const files = fs.readdirSync(absDir).filter(isJpg).sort(naturalSort);
    const uploaded = [];

    try {
      if (files.length === 0) throw new Error('no images in folder');
      console.log(`${tag} ${c.name}  (${files.length} images)`);

      // All-or-nothing: a product created with photos missing looks finished
      // forever, and both resume guards would skip it on every later run.
      for (const f of files) {
        const img = await uploadOne(path.join(absDir, f), m.category);
        uploaded.push(img);
        uploadedBytes += img.bytes;
        await sleep(PAUSE_MS);
      }

      // Record the uploaded assets BEFORE the save, so a failure at the database
      // step leaves a trace of what is now sitting in Cloudinary unreferenced.
      progress.pending[c.id] = { publicIds: uploaded.map((u) => u.publicId) };
      saveProgress(progress);

      const [main, ...subs] = uploaded;
      const doc = new Product({
        name: c.name,
        // Short display label — this is what product CARDS render. The long
        // keyword line belongs in seo.title, which is where the rest of the
        // catalogue keeps it.
        title: c.name,
        description: c.description,
        shortDescription: c.shortDescription,
        category: m.category,
        productCategories: [{ category: m.category, subcategories: [c.sub] }],
        image: main.url,
        imageThumb: main.thumbUrl,
        imageBlur: main.blurData,
        imageTrackingCode: main.trackingCode,
        imagePublicId: main.publicId,
        subImages: subs.map((s) => ({
          url: s.url,
          thumbUrl: s.thumbUrl,
          blurData: s.blurData,
          trackingCode: s.trackingCode,
          publicId: s.publicId,
        })),
        sizes: [],
        colors: c.colors || [],
        minOrderQuantity: 1,
        seo: buildSeo(c, m.category),
        isActive: false, // hidden until the switch-over
      });

      const saved = await saveWithProductCode(doc);
      console.log(`        created ${saved._id}  code ${saved.sku}  (${subs.length} sub-images)`);

      delete progress.pending[c.id];
      progress.done[c.id] = {
        productId: String(saved._id),
        sku: saved.sku,
        slug: saved.slug,
        name: saved.name,
        images: uploaded.length,
        expectedImages: files.length,
      };
      saveProgress(progress);
      created++;
      consecutiveFailures = 0;
    } catch (e) {
      console.error(`${tag} FAILED — ${e.message}`);
      if (uploaded.length) {
        progress.pending[c.id] = { publicIds: uploaded.map((u) => u.publicId), error: e.message };
        saveProgress(progress);
        console.error(`        ${uploaded.length} image(s) already uploaded are recorded in the progress file`);
      }
      failed++;
      consecutiveFailures++;
      if (consecutiveFailures >= ABORT_AFTER_CONSECUTIVE_FAILURES) {
        console.error(
          `\nABORTING — ${consecutiveFailures} products failed in a row. Something is wrong ` +
          `(network, quota or database). Fix it and re-run; finished products are skipped.`
        );
        break;
      }
    }
  }

  const short = Object.entries(progress.done).filter(
    ([, v]) => v.expectedImages && v.images !== v.expectedImages
  );

  console.log('\n=== Done ===');
  console.log(`Created : ${created}`);
  console.log(`Skipped : ${skipped}`);
  console.log(`Failed  : ${failed}`);
  console.log(`Uploaded: ${(uploadedBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Products missing photos: ${short.length}`);
  console.log(`\nAll new products are HIDDEN. Nothing on the website changed.`);
  console.log(`Progress file: ${PROGRESS_PATH}`);
  if (failed > 0) console.log(`\nRe-run the same command to retry the ${failed} that failed.`);
  if (Object.keys(progress.pending).length) {
    console.log(
      `\n${Object.keys(progress.pending).length} product(s) have images in Cloudinary but no ` +
      `product record. Their publicIds are under "pending" in the progress file.`
    );
  }
  if (failed > 0 || short.length > 0) process.exitCode = 1;

  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('\nFATAL:', e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
