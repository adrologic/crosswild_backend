/**
 * STEP 1 — read-only audit of a product-image folder against the live catalogue.
 *
 *   node scripts/auditProductImages.js
 *   node scripts/auditProductImages.js --dir "/path/to/CROSSWILD Products"
 *   node scripts/auditProductImages.js --calibrate     # show the distance spread
 *
 * Answers one question per source folder: is this product ALREADY on the
 * website, is it NEW, or does it need a human eye?
 *
 * Two different comparisons, because two different questions:
 *
 *   folder vs folder  ->  MD5 of the file bytes. Folders copied between
 *                         categories are literally the same file, so an exact
 *                         hash finds them with zero false positives.
 *
 *   folder vs website ->  perceptual fingerprint. The live copy was resized and
 *                         re-encoded on upload and its filename is a generated
 *                         tracking code, so neither bytes nor names can match.
 *                         Uses a 256-bit dHash (structure) AND an 8x8 RGB
 *                         signature (colour). Greyscale structure alone is not
 *                         enough: every product here is a centred object on
 *                         white, so an 8x8 greyscale hash rates a black cap and
 *                         a black bag as the same picture.
 *
 * Touches NOTHING in the database. Writes a JSON report for the upload step.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const sharp = require('sharp');
const Product = require('../models/Product');

const DEFAULT_DIR = path.join(__dirname, '..', '..', 'CROSSWILD Products');
const argValue = (flag) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : null;
};
const SOURCE_DIR = argValue('--dir') || DEFAULT_DIR;
const CALIBRATE = process.argv.includes('--calibrate');
const REPORT_PATH = path.join(__dirname, 'product-image-audit.json');
const CACHE_PATH = path.join(__dirname, '.live-fingerprints.json');

const CATEGORY_MAP = {
  Bags: 'bags',
  Caps: 'caps',
  Tshirts: 'tshirts',
  'jute gift bag': 'bags', // jute gift bags live under Bags
};

// Thresholds are calibrated against this catalogue — see --calibrate. A pair is
// the same product only when BOTH the structure and the colour agree.
const STRUCT_MATCH = 40; // of 256 bits
const COLOUR_MATCH = 12; // mean abs difference per RGB channel, 0-255
const STRUCT_MAYBE = 60;
const COLOUR_MAYBE = 22;
const CONCURRENCY = 6;

const isJpg = (f) => /\.jpe?g$/i.test(f) && !f.startsWith('.');
const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// 256-bit difference hash.
async function structureHash(input) {
  const px = await sharp(input).greyscale().resize(17, 16, { fit: 'fill' }).raw().toBuffer();
  let bits = '';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) bits += px[y * 17 + x] < px[y * 17 + x + 1] ? '1' : '0';
  }
  return BigInt('0b' + bits).toString(16).padStart(64, '0');
}

// 8x8 RGB thumbnail, flattened. Keeps the colour that greyscale throws away.
async function colourSignature(input) {
  const px = await sharp(input).removeAlpha().resize(8, 8, { fit: 'fill' }).raw().toBuffer();
  return Array.from(px);
}

function structureDistance(a, b) {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b);
  let d = 0;
  while (x) {
    d += Number(x & 1n);
    x >>= 1n;
  }
  return d;
}

function colourDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return Math.round(sum / a.length);
}

async function mapWithLimit(items, limit, fn) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) await fn(items[cursor++]);
    })
  );
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

async function run() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`FATAL: source folder not found:\n  ${SOURCE_DIR}`);
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: false,
    ...(process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {}),
  });

  // ── live catalogue ──────────────────────────────────────────────────────
  const live = await Product.find({}).select('name category image slug isActive subImages').lean();
  console.log(`Live products: ${live.length}`);

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
  const needFetch = live.filter((p) => p.image && !cache[p.image]);
  if (needFetch.length) {
    console.log(`Fingerprinting ${needFetch.length} live image(s)...`);
    await mapWithLimit(needFetch, CONCURRENCY, async (p) => {
      try {
        const res = await fetch(p.image, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        cache[p.image] = { struct: await structureHash(buf), colour: await colourSignature(buf) };
      } catch (e) {
        console.log(`  warn: ${p.name}: ${e.message}`);
      }
    });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
  } else {
    console.log('Live fingerprints loaded from cache.');
  }
  live.forEach((p) => {
    const c = cache[p.image];
    if (c) {
      p.struct = c.struct;
      p.colour = c.colour;
    }
  });
  const liveHashed = live.filter((p) => p.struct);
  console.log(`  usable live fingerprints: ${liveHashed.length}\n`);

  // ── local folders ───────────────────────────────────────────────────────
  const groups = [];
  for (const srcFolder of Object.keys(CATEGORY_MAP)) {
    const abs = path.join(SOURCE_DIR, srcFolder);
    if (!fs.existsSync(abs)) {
      console.log(`  (skipping missing folder "${srcFolder}")`);
      continue;
    }
    for (const dirName of fs
      .readdirSync(abs, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort(naturalSort)) {
      const files = fs.readdirSync(path.join(abs, dirName)).filter(isJpg).sort(naturalSort);
      if (!files.length) continue;
      groups.push({
        sourceFolder: srcFolder,
        category: CATEGORY_MAP[srcFolder],
        dir: path.join(srcFolder, dirName),
        absDir: path.join(abs, dirName),
        mainImage: files[0],
        subImages: files.slice(1),
        imageCount: files.length,
      });
    }
  }

  console.log(`Local product folders: ${groups.length}`);
  console.log('Fingerprinting local main images...');
  await mapWithLimit(groups, CONCURRENCY, async (g) => {
    const file = path.join(g.absDir, g.mainImage);
    try {
      g.md5 = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
      g.struct = await structureHash(file);
      g.colour = await colourSignature(file);
    } catch (e) {
      g.error = e.message;
    }
  });
  console.log('  done\n');

  // ── folder vs website ───────────────────────────────────────────────────
  for (const g of groups) {
    if (!g.struct) {
      g.status = 'error';
      continue;
    }
    let best = null;
    let bestS = Infinity;
    let bestC = Infinity;
    for (const p of liveHashed) {
      const s = structureDistance(g.struct, p.struct);
      const c = colourDistance(g.colour, p.colour);
      // Rank on the combined signal so colour can veto a structural near-miss.
      if (s + c * 2 < bestS + bestC * 2) {
        bestS = s;
        bestC = c;
        best = p;
      }
    }
    g.structDistance = bestS;
    g.colourDistance = bestC;
    g.match = best ? { id: String(best._id), name: best.name, category: best.category, slug: best.slug } : null;
    g.status =
      bestS <= STRUCT_MATCH && bestC <= COLOUR_MATCH
        ? 'already-uploaded'
        : bestS <= STRUCT_MAYBE && bestC <= COLOUR_MAYBE
          ? 'uncertain'
          : 'new';
  }

  // ── folder vs folder (exact copies only) ────────────────────────────────
  const byMd5 = new Map();
  groups.forEach((g) => {
    if (!g.md5) return;
    if (!byMd5.has(g.md5)) byMd5.set(g.md5, []);
    byMd5.get(g.md5).push(g);
  });
  const copies = [...byMd5.values()].filter((v) => v.length > 1);
  // Keep the first occurrence, flag the rest so the upload step skips them.
  copies.forEach((set) =>
    set.slice(1).forEach((g) => {
      g.duplicateOf = set[0].dir;
      g.status = 'duplicate-folder';
    })
  );

  if (CALIBRATE) {
    const line = '─'.repeat(72);
    console.log(`${line}\nCALIBRATION — distance to the closest live product\n${line}`);
    for (const srcFolder of Object.keys(CATEGORY_MAP)) {
      const rows = groups.filter((g) => g.sourceFolder === srcFolder && g.struct);
      if (!rows.length) continue;
      const ss = rows.map((r) => r.structDistance);
      const cc = rows.map((r) => r.colourDistance);
      console.log(
        `${srcFolder.padEnd(16)} structure min ${Math.min(...ss)} / median ${median(ss)} / max ${Math.max(...ss)}` +
        `   colour min ${Math.min(...cc)} / median ${median(cc)} / max ${Math.max(...cc)}`
      );
    }
    console.log(
      `\nTshirts and Caps are known to be fully uploaded already, jute gift bag is known to be\n` +
      `entirely new — the gap between those rows is where the threshold belongs.\n` +
      `Current thresholds: match if structure<=${STRUCT_MATCH} AND colour<=${COLOUR_MATCH}\n`
    );
  }

  // ── report ──────────────────────────────────────────────────────────────
  const line = '─'.repeat(72);
  console.log(`${line}\nSUMMARY BY FOLDER\n${line}`);
  for (const srcFolder of Object.keys(CATEGORY_MAP)) {
    const rows = groups.filter((g) => g.sourceFolder === srcFolder);
    if (!rows.length) continue;
    const n = (s) => rows.filter((g) => g.status === s).length;
    console.log(
      `${srcFolder.padEnd(16)} ${String(rows.length).padStart(3)} folders  →  ` +
      `${String(n('already-uploaded')).padStart(3)} already uploaded, ` +
      `${String(n('new')).padStart(3)} new, ` +
      `${n('duplicate-folder')} duplicate folder, ${n('uncertain')} uncertain, ${n('error')} error`
    );
  }

  const news = groups.filter((g) => g.status === 'new');
  const uncertain = groups.filter((g) => g.status === 'uncertain');
  const dupes = groups.filter((g) => g.status === 'duplicate-folder');

  console.log(`\n${line}\nNEW — upload these (${news.length})\n${line}`);
  news.forEach((g) =>
    console.log(`  [${g.category}] ${g.dir}  —  ${g.imageCount} images, main: ${g.mainImage}`)
  );

  if (uncertain.length) {
    console.log(`\n${line}\nUNCERTAIN — I will show you these photos before deciding (${uncertain.length})\n${line}`);
    uncertain.forEach((g) =>
      console.log(
        `  [${g.category}] ${g.dir}  →  closest: "${g.match?.name}" ` +
        `(structure ${g.structDistance}, colour ${g.colourDistance})`
      )
    );
  }

  if (dupes.length) {
    console.log(`\n${line}\nSAME FOLDER COPIED TWICE — identical files, will upload once (${dupes.length})\n${line}`);
    dupes.forEach((g) => console.log(`  ${g.dir}  ==  ${g.duplicateOf}`));
  }

  const failed = groups.filter((g) => g.status === 'error');
  if (failed.length) {
    console.log(`\nCould not read ${failed.length} folder(s):`);
    failed.forEach((g) => console.log(`  ${g.dir}: ${g.error}`));
  }

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedFor: SOURCE_DIR,
        liveProducts: live.length,
        thresholds: { STRUCT_MATCH, COLOUR_MATCH, STRUCT_MAYBE, COLOUR_MAYBE },
        totals: {
          folders: groups.length,
          alreadyUploaded: groups.filter((g) => g.status === 'already-uploaded').length,
          new: news.length,
          duplicateFolder: dupes.length,
          uncertain: uncertain.length,
        },
        groups: groups.map(({ absDir, colour, struct, ...rest }) => rest),
      },
      null,
      2
    )
  );
  console.log(`\nReport written to ${REPORT_PATH}`);
  console.log('Nothing in the database was changed.');

  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('\nFAILED:', e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
