/**
 * Patches pageImages into the 3 Indore location pages in MongoDB.
 *
 * Usage:
 *   node update-indore-images.js "mongodb+srv://USER:PASS@cluster/DBNAME"
 *   or set MONGODB_URI env var
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: Provide MongoDB URI as first argument or set MONGODB_URI env var.');
  process.exit(1);
}

const UPDATES = [
  {
    slug: 'tshirt-manufacturer-in-indore',
    pageImages: [
      '/images/fileBanners/indore/tshirt/indor-CTA-1.webp',
      '/images/fileBanners/indore/tshirt/indor-CTA-2.webp',
    ],
  },
  {
    slug: 'bag-manufacturer-in-indore',
    pageImages: [
      '/images/fileBanners/indore/bags/Laptop-CTA-banner.webp',
      '/images/fileBanners/indore/bags/bags-banner-CTA.webp',
    ],
  },
  {
    slug: 'uniform-manufacturer-in-indore',
    pageImages: [
      '/images/fileBanners/indore/uniform/School-uniform-CTA-banner.webp',
      '/images/fileBanners/indore/uniform/office-uniform-cta-banner.webp',
    ],
  },
];

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('locationpages');

    for (const { slug, pageImages } of UPDATES) {
      const result = await col.updateOne({ slug }, { $set: { pageImages } });
      if (result.matchedCount === 0) {
        console.warn(`  ⚠ Not found in DB: ${slug}`);
      } else {
        console.log(`  ✓ Updated: ${slug}`);
      }
    }

    console.log('\nDone.');
  } finally {
    await client.close();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
