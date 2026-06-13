require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const total = await Product.countDocuments({});
  const active = await Product.countDocuments({ isActive: true });
  console.log(`TOTAL products: ${total}  (active: ${active}, inactive: ${total - active})\n`);

  const byCat = await Product.aggregate([
    { $group: {
        _id: '$category',
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
    } },
    { $sort: { total: -1 } },
  ]);
  console.log('By legacy `category` field (total / active):');
  byCat.forEach((c) => console.log(`  ${String(c._id || '(none)').padEnd(20)} ${c.total} / ${c.active}`));

  const byPC = await Product.aggregate([
    { $unwind: { path: '$productCategories', preserveNullAndEmptyArrays: false } },
    { $group: { _id: '$productCategories.category', total: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  console.log('\nBy productCategories.category:');
  byPC.forEach((c) => console.log(`  ${String(c._id || '(none)').padEnd(20)} ${c.total}`));

  const ts = await Product.find({
    $or: [{ category: 'tshirts' }, { 'productCategories.category': 'tshirts' }, { category: 't-shirts' }],
  }).select('name category isActive createdAt').lean();
  console.log(`\nT-shirt products found: ${ts.length}`);
  ts.forEach((p) => console.log(`  [${p.isActive ? 'LIVE' : 'HIDDEN'}] ${p.name}  (category=${p.category})  created=${p.createdAt && p.createdAt.toISOString().slice(0,10)}`));

  // What the default "all products" API call returns (no category, limit 50, newest first)
  const firstPage = await Product.find({ isActive: true })
    .sort({ createdAt: -1 }).limit(50).select('name category createdAt').lean();
  const catsOnFirstPage = {};
  firstPage.forEach((p) => { catsOnFirstPage[p.category] = (catsOnFirstPage[p.category] || 0) + 1; });
  console.log(`\nDefault API (isActive:true, sort newest, limit 50) returns ${firstPage.length} products.`);
  console.log('Categories on that first page:', catsOnFirstPage);

  await mongoose.disconnect();
  process.exit(0);
}
run().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
