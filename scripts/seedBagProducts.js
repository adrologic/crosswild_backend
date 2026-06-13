/**
 * Bulk-upload 20 bag products from the "Bag Images" folder.
 *
 * - Scans ../../Bag Images, groups files by their leading number (181..200).
 *   Within a product, image "(1)" is the main image, the rest are sub-images.
 * - Uploads every image to Cloudinary (crosswild/products/bags) via uploadToImgBB.
 * - Creates each Product through the current Product model (image URL + tracking
 *   code + subImages objects). No price is set (B2B catalog). Ratings/reviews left at 0.
 *
 * Visibility is controlled by env var PUBLISH_LIVE:
 *   PUBLISH_LIVE=true  -> products go live immediately (isActive: true)
 *   (unset / false)    -> products created as hidden drafts (isActive: false)
 *
 * Idempotent: a product whose `name` already exists is skipped.
 *
 * Run from TheCrossWildBackend:
 *   PUBLISH_LIVE=false node scripts/seedBagProducts.js     # drafts
 *   PUBLISH_LIVE=true  node scripts/seedBagProducts.js     # live
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { uploadToImgBB, deleteImage } = require('../utils/imgbbUpload');

const IMAGES_DIR = process.env.BAG_IMAGES_DIR || path.join(__dirname, '..', '..', 'Bag Images');
const CATEGORY = 'bags';
const IS_ACTIVE = process.env.PUBLISH_LIVE === 'true';

// Per-product content (keyed by the folder number). Subcategory ids match
// seedCategories.js -> Bags. SEO is generated from these fields below.
const PRODUCTS = [
  {
    num: 181,
    name: 'Office Laptop Messenger Bag',
    title: 'Custom Laptop Messenger Bag - Padded Office Briefcase with Logo Branding',
    shortDescription: 'Structured grey laptop messenger bag with padded compartment, front zip pocket and detachable shoulder strap.',
    description: 'Structured laptop messenger bag in premium grey poly fabric with a padded laptop compartment, a front zip organiser pocket and a detachable shoulder strap plus reinforced top carry handles. A smart, professional carry for corporate teams and office gifting. Available blank or with your custom printed/embroidered logo for bulk orders.',
    sub: 'laptop-bags',
    colors: ['Grey'],
    featured: true,
  },
  {
    num: 182,
    name: 'Royal Blue Laptop Messenger Bag',
    title: 'Custom Blue Laptop Messenger Bag - Lightweight Office Sling Bag',
    shortDescription: 'Lightweight royal-blue messenger laptop bag with padded compartment and adjustable shoulder strap.',
    description: 'Lightweight messenger-style laptop bag in vivid royal-blue water-resistant polyester. A padded main compartment, front zip pocket and an adjustable shoulder strap make it ideal for the daily commute and corporate branding. Fully customisable with logo printing or embroidery for bulk orders.',
    sub: 'laptop-bags',
    colors: ['Blue'],
  },
  {
    num: 183,
    name: 'Charcoal Crossbody Sling Bag',
    title: 'Custom Crossbody Sling Bag - Compact Travel & Tablet Sling',
    shortDescription: 'Compact charcoal vertical crossbody sling with zip front pocket and adjustable padded strap.',
    description: 'Compact vertical crossbody sling in textured charcoal fabric with a zip front pocket and a roomy main compartment that fits a tablet, wallet and daily essentials. An adjustable padded strap allows comfortable hands-free carry. Shown with sample branding — available blank or custom-printed with your logo.',
    sub: 'office-bags',
    colors: ['Charcoal', 'Dark Grey'],
  },
  {
    num: 184,
    name: 'Black Laptop Briefcase Bag',
    title: 'Custom Black Laptop Briefcase - Slim Office Bag with Shoulder Strap',
    shortDescription: 'Slim black laptop briefcase with twin top handles, detachable strap and padded laptop section.',
    description: 'Slim black laptop briefcase with reinforced top handles, a detachable shoulder strap and a padded laptop section. A clean, professional design suited to office staff and corporate gifting. Add your company logo via embroidery or print for bulk orders.',
    sub: 'laptop-bags',
    colors: ['Black'],
  },
  {
    num: 185,
    name: 'Navy Crossbody Sling Bag',
    title: 'Custom Navy Sling Bag - Everyday Crossbody Messenger',
    shortDescription: 'Durable navy crossbody sling with zip front pocket and adjustable shoulder strap.',
    description: 'Everyday crossbody sling bag in durable navy polyester featuring a zip front pocket, a padded main compartment and an adjustable shoulder strap. Great for college, travel and promotional gifting. Customise with your brand logo for bulk supply.',
    sub: 'office-bags',
    colors: ['Navy Blue'],
  },
  {
    num: 186,
    name: 'Brown Leatherette Office Bag',
    title: 'Custom Leatherette Office Messenger Bag - Executive Document Bag',
    shortDescription: 'Brown PU leatherette executive office bag with multiple zip pockets, twin handles and strap.',
    description: 'Executive office messenger bag in rich brown leatherette (PU) with multiple zip compartments, a front utility pocket, twin carry handles and a shoulder strap. A premium look for corporate gifting and document carrying. Shown with a sample logo — available with your custom branding.',
    sub: 'office-bags',
    colors: ['Brown'],
    featured: true,
  },
  {
    num: 187,
    name: 'Black Casual Laptop Backpack',
    title: 'Custom Black Laptop Backpack - Daily Office & College Backpack',
    shortDescription: 'Versatile black backpack with padded laptop sleeve, mesh side pockets and cushioned straps.',
    description: 'Versatile black backpack with a padded laptop sleeve, a spacious main compartment, mesh side bottle pockets and cushioned shoulder straps. Built for office, college and the daily commute. Ideal for bulk corporate or institutional branding.',
    sub: 'laptop-bags',
    colors: ['Black'],
  },
  {
    num: 188,
    name: 'Blue Vertical Sling Bag',
    title: 'Custom Vertical Sling Bag - Compact Crossbody Utility Bag',
    shortDescription: 'Compact navy vertical sling with zip top, front organiser pocket and adjustable strap.',
    description: 'Compact vertical sling in textured navy fabric with a zip top, a front organiser pocket and an adjustable crossbody strap — fits a tablet, power bank and daily essentials. Shown with sample branding; available blank or with your custom logo.',
    sub: 'office-bags',
    colors: ['Navy Blue'],
  },
  {
    num: 189,
    name: 'Teal Crossbody Sling Bag',
    title: 'Custom Teal Sling Bag - Lightweight Crossbody Travel Bag',
    shortDescription: 'Lightweight teal-blue crossbody sling with zip front pocket and adjustable strap.',
    description: 'Lightweight crossbody sling in eye-catching teal blue with a zip front pocket, a padded back and an adjustable strap. A smart everyday and travel companion, perfect for promotional gifting and custom logo branding in bulk.',
    sub: 'office-bags',
    colors: ['Teal', 'Blue'],
  },
  {
    num: 190,
    name: 'Spiderman Kids School Backpack',
    title: 'Spiderman Kids School Bag - Cartoon Print Backpack for Kids',
    shortDescription: 'Lightweight kids school backpack with vibrant Spiderman print and padded straps.',
    description: 'A fun and lightweight kids school backpack featuring a vibrant Spiderman print, a zip front pocket, padded straps and a comfortable size for primary-school children. Available in bulk for schools and stores, with custom cartoon or school branding prints.',
    sub: 'school-bags',
    colors: ['Orange', 'Blue'],
  },
  {
    num: 191,
    name: 'Grey Slim Laptop Sleeve Bag',
    title: 'Custom Slim Laptop Sleeve Bag - Padded 14/15.6 inch Sleeve',
    shortDescription: 'Slim heather-grey laptop sleeve with padded interior, front zip pocket and top handle.',
    description: 'Minimal slim laptop sleeve in heather grey fabric with a padded interior, a front zip document pocket and a top carry handle. Protects laptops up to 15.6 inches. A premium-feel corporate gift, available with custom logo branding for bulk orders.',
    sub: 'laptop-bags',
    colors: ['Grey'],
  },
  {
    num: 192,
    name: 'Motu Patlu Kids School Backpack',
    title: 'Motu Patlu Kids School Bag - Cartoon Backpack for Kids',
    shortDescription: 'Colourful kids school backpack with Motu Patlu print and padded adjustable straps.',
    description: 'Colourful kids school backpack with a Motu Patlu cartoon front print, zip main and front compartments and padded adjustable straps. Lightweight and durable for daily school use — ideal for bulk supply and custom character or school branding prints.',
    sub: 'school-bags',
    colors: ['Red', 'Black'],
  },
  {
    num: 193,
    name: 'Pre-School Kids Backpack',
    title: 'Custom Pre-School Kids Backpack - Nursery School Bag with Print',
    shortDescription: 'Bright pink-and-yellow pre-school backpack with fun print and lightweight padded straps.',
    description: 'Bright pink-and-yellow pre-school backpack with a fun front print, a side mesh pocket and lightweight padded straps sized for nursery and pre-primary kids. Shown with sample school branding — perfect for bulk school orders with custom logo printing.',
    sub: 'school-bags',
    colors: ['Pink', 'Yellow'],
  },
  {
    num: 194,
    name: 'Barbie Kids School Backpack',
    title: 'Barbie Kids School Bag - Girls Cartoon Print Backpack',
    shortDescription: 'Red girls school backpack with Barbie front print, dual compartments and padded straps.',
    description: "Charming girls school backpack in red with a Barbie 'Forever Friends' front print, dual zip compartments and padded straps. Lightweight and roomy for primary-school girls. Available in bulk with custom cartoon and school branding prints.",
    sub: 'school-bags',
    colors: ['Red', 'Pink'],
  },
  {
    num: 195,
    name: 'Black Laptop Office Bag',
    title: 'Custom Black Laptop Office Bag - Corporate Branded Briefcase',
    shortDescription: 'Smart black office laptop bag with padded handles, laptop compartment and detachable strap.',
    description: 'Smart black office laptop bag with padded handles, a dedicated laptop compartment, a front zip organiser pocket and a detachable shoulder strap. A popular choice for corporate onboarding kits and bulk gifting. Shown with a sample logo — fully customisable with your branding.',
    sub: 'laptop-bags',
    colors: ['Black'],
    featured: true,
  },
  {
    num: 196,
    name: 'Corporate Branded Backpack',
    title: 'Custom Corporate Backpack - Branded Office & School Backpack',
    shortDescription: 'Sturdy navy-and-grey backpack with large front logo panel, zip compartments and padded back.',
    description: 'Sturdy navy-and-grey backpack with a large front logo panel, multiple zip compartments, a side mesh pocket and a padded back and straps. Designed for corporate, institutional and school branding in bulk. Shown with a sample print — add your own logo.',
    sub: 'corporate-bags',
    colors: ['Navy Blue', 'Grey'],
    featured: true,
  },
  {
    num: 197,
    name: 'Black & Tan Messenger Bag',
    title: 'Custom Messenger Bag - Black & Tan Office Laptop Satchel',
    shortDescription: 'Black-and-tan flap messenger satchel with padded laptop section and adjustable crossbody strap.',
    description: 'A stylish messenger satchel combining black fabric with tan trim, a wide front flap, a padded laptop section and an adjustable crossbody strap. A trendy yet professional bag for office and college use — available with custom logo branding for bulk orders.',
    sub: 'office-bags',
    colors: ['Black', 'Tan'],
  },
  {
    num: 198,
    name: 'Gym Duffel Barrel Bag',
    title: 'Custom Gym Duffel Bag - Round Barrel Sports & Travel Bag',
    shortDescription: 'Round blue barrel gym duffel with contrast zips, front pocket and adjustable shoulder strap.',
    description: 'Compact round barrel gym duffel in blue with contrast yellow zips, a roomy main compartment, a front zip pocket and a padded adjustable shoulder strap. Lightweight and water-resistant — perfect for gyms, sports clubs and promotional branding in bulk.',
    sub: 'gym-bags',
    colors: ['Blue', 'Yellow'],
  },
  {
    num: 199,
    name: 'Insulated Food Delivery Bag',
    title: 'Custom Food Delivery Bag - Insulated Thermal Delivery Bag',
    shortDescription: 'Large insulated food delivery bag with thermal lining, secure top flap and reinforced straps.',
    description: 'A large insulated food delivery bag with thermal lining, a secure top flap and reinforced carry straps that keep meals hot or cold during transit. Built for restaurants, cloud kitchens and delivery fleets — available in bulk with custom logo printing.',
    sub: 'food-delivery-bags',
    colors: ['Black'],
  },
  {
    num: 200,
    name: 'Sports Gym Duffel Bag',
    title: 'Custom Sports Gym Bag - Spacious Duffel Bag for Gym & Travel',
    shortDescription: 'Spacious black gym duffel with bold zips, multiple pockets and padded shoulder strap.',
    description: 'Spacious black gym duffel with bold yellow zips, a large main compartment, multiple zip pockets and a padded shoulder strap. Durable water-resistant fabric for gym, sports and travel. Shown with a sample print — ideal for fitness brands and bulk custom branding.',
    sub: 'gym-bags',
    colors: ['Black', 'Yellow'],
  },
];

// Build the SEO block from a product's content.
function buildSeo(p) {
  const colorWords = (p.colors || []).join(' ').toLowerCase();
  const baseType = p.name.toLowerCase();
  const keywords = Array.from(new Set([
    baseType,
    `custom ${baseType}`,
    `${baseType} wholesale`,
    `bulk ${baseType} india`,
    `${colorWords} bag`.trim(),
    'custom printed bags',
    'corporate gifting bags',
    'thecrosswild bags',
  ].filter(Boolean)));
  return {
    title: p.title.slice(0, 120),
    description: p.shortDescription.slice(0, 300),
    keywords,
    noIndex: false,
    noFollow: false,
  };
}

// Group image files in the folder by their leading product number.
function collectImages() {
  const files = fs.readdirSync(IMAGES_DIR);
  const re = /^(\d+)\s*\((\d+)\)\.(?:jpe?g|png)$/i;
  const byNum = {};
  for (const f of files) {
    const m = f.match(re);
    if (!m) continue;
    const num = Number(m[1]);
    const idx = Number(m[2]);
    (byNum[num] = byNum[num] || []).push({ idx, file: f });
  }
  for (const num of Object.keys(byNum)) {
    byNum[num].sort((a, b) => a.idx - b.idx);
  }
  return byNum;
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
  if (!process.env.CLOUDINARY_CLOUD_NAME) throw new Error('Cloudinary not configured');

  console.log(`\nVisibility: ${IS_ACTIVE ? 'LIVE (isActive: true)' : 'DRAFT (isActive: false)'}\n`);

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  // Optional cleanup: delete only the products created by THIS script (matched
  // by exact name) and remove their Cloudinary assets, so a re-run starts clean.
  if (process.env.RESET === 'true') {
    const names = PRODUCTS.map((p) => p.name);
    const existing = await Product.find({ name: { $in: names } });
    console.log(`RESET: removing ${existing.length} previously-created bag product(s)...`);
    for (const doc of existing) {
      try {
        if (doc.imagePublicId) await deleteImage(doc.imagePublicId);
        for (const s of doc.subImages || []) {
          if (s.publicId) await deleteImage(s.publicId);
        }
        await doc.deleteOne();
        console.log(`  removed ${doc.name} (${doc._id})`);
      } catch (e) {
        console.log(`  warn: could not fully remove ${doc.name}: ${e.message}`);
      }
    }
    console.log('');
  }

  const images = collectImages();

  let created = 0, skipped = 0, failed = 0;

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const tag = `[${i + 1}/${PRODUCTS.length}] #${p.num} ${p.name}`;
    try {
      const existing = await Product.findOne({ name: p.name });
      if (existing) {
        console.log(`${tag} -> already exists (${existing._id}), skipping.`);
        skipped++;
        continue;
      }

      const group = images[p.num];
      if (!group || group.length === 0) {
        console.log(`${tag} -> NO IMAGES found for ${p.num}, skipping.`);
        failed++;
        continue;
      }

      // Main image = first (lowest index, normally "(1)").
      const mainFile = group[0].file;
      const subFiles = group.slice(1).map((g) => g.file);

      console.log(`${tag} -> uploading main image ${mainFile} ...`);
      const main = await uploadToImgBB(path.join(IMAGES_DIR, mainFile), 'file', CATEGORY);

      const subImages = [];
      for (const sf of subFiles) {
        try {
          const s = await uploadToImgBB(path.join(IMAGES_DIR, sf), 'file', CATEGORY);
          subImages.push({ url: s.url, trackingCode: s.trackingCode, publicId: s.publicId });
          await new Promise((r) => setTimeout(r, 400));
        } catch (e) {
          console.log(`    warn: failed sub-image ${sf}: ${e.message}`);
        }
      }

      const doc = await Product.create({
        name: p.name,
        title: p.title,
        description: p.description,
        shortDescription: p.shortDescription,
        category: CATEGORY,
        productCategories: [{ category: CATEGORY, subcategories: [p.sub] }],
        image: main.url,
        imageTrackingCode: main.trackingCode,
        imagePublicId: main.publicId,
        subImages,
        sizes: ['Free Size'],
        colors: p.colors || [],
        newArrival: true,
        featured: !!p.featured,
        seo: buildSeo(p),
        isActive: IS_ACTIVE,
      });

      console.log(`    created ${doc._id}  (${subImages.length} sub-images, sub-cat: ${p.sub})\n`);
      created++;
      await new Promise((r) => setTimeout(r, 700));
    } catch (e) {
      console.error(`${tag} -> FAILED: ${e.message}\n`);
      failed++;
    }
  }

  console.log('=== Done ===');
  console.log(`Created: ${created}  Skipped (existing): ${skipped}  Failed: ${failed}`);
  console.log(`Visibility: ${IS_ACTIVE ? 'LIVE' : 'DRAFT (hidden)'}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
