/**
 * Full export of every product document, exactly as stored.
 *
 *   node scripts/backupProducts.js
 *
 * Run this before any bulk delete or bulk re-upload. The file it writes is a
 * complete restore point: names, descriptions, taglines, sections, SEO fields,
 * slugs, image URLs, sub-images, tracking codes, categories and flags.
 *
 * Restoring is a separate, deliberate step — see scripts/restoreProducts.js.
 * Read-only: this script never writes to the database.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: false,
    ...(process.env.MONGODB_DB ? { dbName: process.env.MONGODB_DB } : {}),
  });

  const products = await Product.find({}).lean();
  const active = products.filter((p) => p.isActive).length;

  // Timestamp in the filename so a second run never overwrites the first.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `products-${stamp}.json`);

  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        takenAt: new Date().toISOString(),
        database: mongoose.connection.name,
        count: products.length,
        products,
      },
      null,
      2
    )
  );

  // A flat companion file that is easy to eyeball without opening the big one.
  const indexFile = path.join(BACKUP_DIR, `products-${stamp}.index.txt`);
  fs.writeFileSync(
    indexFile,
    products
      .map((p) =>
        [
          String(p._id),
          p.isActive ? 'LIVE  ' : 'HIDDEN',
          (p.category || '-').padEnd(10),
          (p.sku || '------').padEnd(8),
          (p.slug || '').padEnd(52),
          p.name,
        ].join('  ')
      )
      .join('\n')
  );

  const bytes = fs.statSync(file).size;
  console.log(`Backed up ${products.length} products (${active} live, ${products.length - active} hidden)`);
  console.log(`  ${file}  (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  ${indexFile}`);
  console.log('\nEvery field was exported, including slugs and SEO. Nothing was changed.');

  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('\nFAILED:', e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
