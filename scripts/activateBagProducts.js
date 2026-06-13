/**
 * Publish bag products to the website (set isActive: true).
 *
 * - Reports the current state of the Bags category (active / hidden).
 * - Activates every product in the Bags category.
 *
 * Run from TheCrossWildBackend:  node scripts/activateBagProducts.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function run() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
  await mongoose.connect(process.env.MONGODB_URI);

  // Match both the legacy `category` field and the newer productCategories array.
  const bagsFilter = { $or: [{ category: 'bags' }, { 'productCategories.category': 'bags' }] };

  const all = await Product.find(bagsFilter).select('name isActive').lean();
  const activeBefore = all.filter((p) => p.isActive);
  const hiddenBefore = all.filter((p) => !p.isActive);

  console.log(`\nBags category: ${all.length} product(s) total`);
  console.log(`  already live : ${activeBefore.length}`);
  console.log(`  hidden       : ${hiddenBefore.length}`);
  if (hiddenBefore.length) {
    console.log('\nFlipping these hidden bags to LIVE:');
    hiddenBefore.forEach((p) => console.log(`  - ${p.name}`));
  }

  const result = await Product.updateMany(
    { ...bagsFilter, isActive: { $ne: true } },
    { $set: { isActive: true } }
  );

  const liveNow = await Product.countDocuments({ ...bagsFilter, isActive: true });

  console.log(`\n=== Done ===`);
  console.log(`Newly published: ${result.modifiedCount}`);
  console.log(`Bags now live on the website: ${liveNow}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
