/**
 * Replace symbol connectors (/ and +) in product `title` with connector
 * words (with / for / and / or), chosen per-title for natural reading.
 *
 * Implementation: an explicit map of { old title -> new title }. The script
 * matches each product by its EXACT current title; only matched titles are
 * updated. Any title still containing / or + after mapping is flagged and
 * NOT written.
 *
 * The write is exactly:
 *   updateOne({ _id }, { $set: { title } }, { timestamps: false })
 *
 * Dry run:  node scripts/cleanTitleConnectors.js --dry-run   (default)
 * Apply:    node scripts/cleanTitleConnectors.js --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

// old title  ->  new title   (connector words chosen per context)
const MAP = {
  // ---- tshirts ----
  'Oversized Cotton T-Shirt / Screen Printing & Embroidery': 'Oversized Cotton T-Shirt with Screen Printing & Embroidery',
  'Oversized Streetwear T-Shirt / Plastisol & Discharge Printing': 'Oversized Streetwear T-Shirt with Plastisol & Discharge Printing',
  'Multi-Placement Print Oversized T-Shirt / Front, Back & Sleeve': 'Multi-Placement Print Oversized T-Shirt with Front, Back & Sleeve',
  'Graphic Print Oversized T-Shirt / Streetwear Production': 'Graphic Print Oversized T-Shirt for Streetwear Production',
  'Heather Polo T-Shirt / Corporate & Office Uniforms': 'Heather Polo T-Shirt for Corporate & Office Uniforms',
  'Solid Polo T-Shirt / Branded Corporate Wear': 'Solid Polo T-Shirt for Branded Corporate Wear',
  'Sublimation Sports Jersey / Full Colour Team Uniforms': 'Sublimation Sports Jersey for Full Colour Team Uniforms',
  'Solid Cotton Round Neck T-Shirt / Brand Blanks': 'Solid Cotton Round Neck T-Shirt for Brand Blanks',
  'Dry-Fit V-Neck T-Shirt / Sportswear Production': 'Dry-Fit V-Neck T-Shirt for Sportswear Production',
  'Athletic Dry-Fit Round Neck / Sports & Gym Tees': 'Athletic Dry-Fit Round Neck for Sports & Gym Tees',
  'Textured Piqué Polo / Premium Corporate & Hospitality Wear': 'Textured Piqué Polo for Premium Corporate & Hospitality Wear',
  'Honeycomb Piqué Sports Polo / Tournament & Club Polos': 'Honeycomb Piqué Sports Polo for Tournament & Club Polos',
  'Boxy Cotton Oversized T-Shirt / Premium Streetwear Blanks': 'Boxy Cotton Oversized T-Shirt for Premium Streetwear Blanks',
  'Twin-Tipped Polo / Heritage Cotton Piqué Polos': 'Twin-Tipped Polo for Heritage Cotton Piqué Polos',
  'Heather Twin-Tipped Polo / Premium Branded Polos India': 'Heather Twin-Tipped Polo for Premium Branded Polos India',
  'Embroidered Polo / Corporate Uniforms with Chest Logo': 'Embroidered Polo for Corporate Uniforms with Chest Logo',
  'Pastel Polo T-Shirt / Soft-Colour Corporate Polos': 'Pastel Polo T-Shirt for Soft-Colour Corporate Polos',
  'White Tipped Polo / Branded Corporate Polos': 'White Tipped Polo for Branded Corporate Polos',
  'Active Wear Cotton Polo / Branded Sport Polos': 'Active Wear Cotton Polo for Branded Sport Polos',
  'Polyester Sublimation T-Shirt / Print-Ready Blanks': 'Polyester Sublimation T-Shirt for Print-Ready Blanks',
  'Multi-Sponsor Polo / Tournament & League Branded Polos': 'Multi-Sponsor Polo for Tournament & League Branded Polos',
  'Black-Tipped White Polo / Branded Polos India': 'Black-Tipped White Polo for Branded Polos India',
  'Solid Red Polo / Cotton Piqué Polos India': 'Solid Red Polo for Cotton Piqué Polos India',
  'Sky Blue Polo / Soft-Colour Corporate Uniforms': 'Sky Blue Polo for Soft-Colour Corporate Uniforms',
  'Dry-Fit Lavender Polo / Premium Sport & Lifestyle Polos': 'Dry-Fit Lavender Polo for Premium Sport & Lifestyle Polos',
  'Raglan Slogan T-Shirt / Custom Fashion Tees': 'Raglan Slogan T-Shirt for Custom Fashion Tees',
  'Polyester Mesh Sports Vest / Gym & Training Tanks': 'Polyester Mesh Sports Vest for Gym & Training Tanks',
  'Sublimated Sports Polo / Tournament Team Polos': 'Sublimated Sports Polo for Tournament Team Polos',
  'Sublimated Team Jersey / Multi-Sponsor League Jerseys': 'Sublimated Team Jersey for Multi-Sponsor League Jerseys',
  'Sublimated Sports T-Shirt / Custom Pattern Team Tees': 'Sublimated Sports T-Shirt for Custom Pattern Team Tees',
  'Acid-Wash Oversized T-Shirt / Vintage Premium Streetwear': 'Acid-Wash Oversized T-Shirt for Vintage Premium Streetwear',
  'Bright Polyester Polo / Event Staff & Promotional Polos': 'Bright Polyester Polo for Event Staff & Promotional Polos',
  'Oversized Cotton Blank / Print-Ready Tees': 'Oversized Cotton Blank for Print-Ready Tees',
  'Pocket Polo / Cotton Polo with Custom Pocket Branding': 'Pocket Polo for Cotton Polo with Custom Pocket Branding',
  'Teal Dry-Fit Polo / Sport & Lifestyle Polos': 'Teal Dry-Fit Polo for Sport & Lifestyle Polos',
  'Graphic Oversized T-Shirt / Premium Acid-Wash Streetwear': 'Graphic Oversized T-Shirt for Premium Acid-Wash Streetwear',
  'Embroidered Oversized T-Shirt / Corporate Streetwear': 'Embroidered Oversized T-Shirt for Corporate Streetwear',
  'Polyester Print-Ready T-Shirt / Sublimation & DTF Blanks': 'Polyester Print-Ready T-Shirt for Sublimation & DTF Blanks',

  // ---- caps ----
  'Mesh Baseball Cap / Custom Embroidered Caps India': 'Mesh Baseball Cap for Custom Embroidered Caps India',
  'Two-Tone Cotton Dad Cap / Custom Embroidered Lifestyle Caps': 'Two-Tone Cotton Dad Cap for Custom Embroidered Lifestyle Caps',
  'Solid 5-Panel Cotton Cap / Blank & Custom Print': 'Solid 5-Panel Cotton Cap for Blank & Custom Print',
  'Imported Tech-Fabric Cap / Premium Performance Caps': 'Imported Tech-Fabric Cap for Premium Performance Caps',
  'Corporate Industrial Cap / Patch + Print + Side Brand': 'Corporate Industrial Cap with Patch and Print and Side Brand',
  'Woven Fedora Hat / Fashion & Resort Hats': 'Woven Fedora Hat for Fashion & Resort Hats',
  'Camo Boonie Hat / Wildlife, Safari & Outdoor Programmes': 'Camo Boonie Hat for Wildlife, Safari & Outdoor Programmes',
  'Corduroy Baseball Cap / Premium Custom Embroidered Caps': 'Corduroy Baseball Cap for Premium Custom Embroidered Caps',
  'Patch Embroidery Dad Cap / Lifestyle Custom Caps': 'Patch Embroidery Dad Cap for Lifestyle Custom Caps',
  'Full-Mesh Embroidered Cap / Defence & Regimental Caps': 'Full-Mesh Embroidered Cap for Defence & Regimental Caps',
  '3D Puff Embroidery Cap / Foodservice & Brand Caps': '3D Puff Embroidery Cap for Foodservice & Brand Caps',
  'All-Over Print Cap / Block-Print & Floral Pattern Caps': 'All-Over Print Cap for Block-Print & Floral Pattern Caps',
  'Promotional Campaign Cap / Government & Awareness Drives': 'Promotional Campaign Cap for Government & Awareness Drives',
  'Service / Uniformed Cap / Imported Fabric Volunteer Caps': 'Service or Uniformed Cap for Imported Fabric Volunteer Caps',
  'Multi-Colour Embroidery Cap / Eco / Festival Programmes': 'Multi-Colour Embroidery Cap for Eco or Festival Programmes',
  'Laser-Perforated Sports Cap / Golf & Performance': 'Laser-Perforated Sports Cap for Golf & Performance',
  'Regimental Commemorative Cap / Defence Anniversary Caps': 'Regimental Commemorative Cap for Defence Anniversary Caps',
  'Wool-Twill Heritage Cap / Polo Club & Heritage Sports': 'Wool-Twill Heritage Cap for Polo Club & Heritage Sports',
  'Camo Cotton Cap / Eco & Wildlife Reserve Caps': 'Camo Cotton Cap for Eco & Wildlife Reserve Caps',
  'Faux-Suede Cap / Outdoor & Adventure Brand Caps': 'Faux-Suede Cap for Outdoor & Adventure Brand Caps',
  'Heritage Tourism Cap / Floral Embroidered Cotton Caps': 'Heritage Tourism Cap for Floral Embroidered Cotton Caps',
  '3D Monogram Cap / Sports & Lifestyle Caps': '3D Monogram Cap for Sports & Lifestyle Caps',
  'Travel & Tourism Cap / Mesh Embroidered Caps': 'Travel & Tourism Cap for Mesh Embroidered Caps',
  'Motorsport Sponsor Cap / Racing & Dealership Caps': 'Motorsport Sponsor Cap for Racing & Dealership Caps',
  'Security Uniform Cap / Branded Service Caps India': 'Security Uniform Cap for Branded Service Caps India',
  'City Tourism Cap / Heritage Embroidered Souvenir Caps': 'City Tourism Cap for Heritage Embroidered Souvenir Caps',
  'Decorative Embroidery Cap / Lifestyle & Spiritual Caps': 'Decorative Embroidery Cap for Lifestyle & Spiritual Caps',
  'Trucker Mascot Cap / Sports Team Trucker Caps': 'Trucker Mascot Cap for Sports Team Trucker Caps',
  'Flat-Brim Snapback / Streetwear & Capsule Caps': 'Flat-Brim Snapback for Streetwear & Capsule Caps',
  'Sun Visor / Sports & Service Visors India': 'Sun Visor for Sports & Service Visors India',
  'Suede Trucker Cap / Premium Streetwear Trucker Caps': 'Suede Trucker Cap for Premium Streetwear Trucker Caps',
  'Plain Promotional Cap / Blank & Print-Ready Caps': 'Plain Promotional Cap for Blank & Print-Ready Caps',
  'Safari Bucket Hat / Outdoor & Resort Hats India': 'Safari Bucket Hat for Outdoor & Resort Hats India',
  'Ceremonial Wide-Brim Hat / Service & Commemorative Hats': 'Ceremonial Wide-Brim Hat for Service & Commemorative Hats',
  'Cricket Sun Hat / Bright-Colour Sports Hats India': 'Cricket Sun Hat for Bright-Colour Sports Hats India',
  'Service Anniversary Cap / Silver Jubilee & Reunion Caps': 'Service Anniversary Cap for Silver Jubilee & Reunion Caps',
};

async function main() {
  const isApply = process.argv.includes('--apply');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  const products = await Product.find({}).lean();

  const toUpdate = [];
  const skipped = [];
  const flagged = [];
  const unmatchedWithSymbols = [];

  for (const p of products) {
    const cur = p.title || '';
    const mapped = MAP[cur];
    if (mapped === undefined) {
      // not in map — if it still has / or +, surface it so nothing is missed
      if (/[/+]/.test(cur)) unmatchedWithSymbols.push({ _id: p._id, category: p.category, title: cur });
      else skipped.push({ _id: p._id });
      continue;
    }
    if (/[/+]/.test(mapped)) {
      flagged.push({ _id: p._id, category: p.category, oldTitle: cur, newTitle: mapped, reason: 'mapped value still contains / or +' });
      continue;
    }
    if (mapped === cur) {
      skipped.push({ _id: p._id });
      continue;
    }
    toUpdate.push({ _id: p._id, category: p.category, oldTitle: cur, newTitle: mapped });
  }

  if (toUpdate.length) {
    console.log('=== Will Update ===');
    for (const u of toUpdate) {
      console.log(`[${u.category}] ${String(u._id).slice(-6)}`);
      console.log(`   OLD: "${u.oldTitle}"`);
      console.log(`   NEW: "${u.newTitle}"`);
    }
    console.log();
  }

  if (unmatchedWithSymbols.length) {
    console.log('=== Unmatched but STILL has / or + (not in map) ===');
    for (const u of unmatchedWithSymbols) {
      console.log(`[${u.category}] ${String(u._id).slice(-6)}  "${u.title}"`);
    }
    console.log();
  }

  if (flagged.length) {
    console.log('=== Flagged (mapped value still has symbol — NOT applied) ===');
    for (const f of flagged) {
      console.log(`[${f.category}] ${String(f._id).slice(-6)}  (${f.reason})`);
      console.log(`   OLD: "${f.oldTitle}"`);
      console.log(`   NEW: "${f.newTitle}"`);
    }
    console.log();
  }

  console.log(`Total scanned: ${products.length}`);
  console.log(`Will update:   ${toUpdate.length}`);
  console.log(`Skipped (no change / not in map & no symbols): ${skipped.length}`);
  console.log(`Unmatched with symbols (needs map entry): ${unmatchedWithSymbols.length}`);
  console.log(`Flagged: ${flagged.length}`);

  if (!isApply) {
    console.log('\n--dry-run mode (default). No writes performed. Re-run with --apply to perform updates.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (!toUpdate.length) {
    console.log('\nNothing to apply.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ---- APPLY ---------------------------------------------------------
  const sampleCount = Math.min(2, toUpdate.length);
  const sampleIdx = [];
  while (sampleIdx.length < sampleCount) {
    const i = Math.floor(Math.random() * toUpdate.length);
    if (!sampleIdx.includes(i)) sampleIdx.push(i);
  }
  const sampleIds = sampleIdx.map(i => toUpdate[i]._id);
  const snapshotsBefore = await Promise.all(sampleIds.map(id => Product.findById(id).lean()));

  console.log('\n=== Applying updates ===');
  let updated = 0;
  let failed = 0;
  const failures = [];
  for (const u of toUpdate) {
    try {
      const r = await Product.updateOne(
        { _id: u._id },
        { $set: { title: u.newTitle } },
        { timestamps: false }
      );
      if (r.matchedCount === 1) {
        console.log(`✓ updated ${u._id}  →  "${u.newTitle}"`);
        updated++;
      } else {
        console.log(`? ${u._id} matchedCount=${r.matchedCount} modifiedCount=${r.modifiedCount}`);
        failed++;
        failures.push({ _id: u._id, reason: `unexpected match/modify (${r.matchedCount}/${r.modifiedCount})` });
      }
    } catch (e) {
      console.log(`✗ FAILED ${u._id}: ${e.message}`);
      failed++;
      failures.push({ _id: u._id, reason: e.message });
    }
  }

  console.log(`\nUpdated: ${updated}`);
  console.log(`Failed:  ${failed}`);
  if (failures.length) {
    console.log('Failures:');
    for (const f of failures) console.log(`  - ${f._id} :: ${f.reason}`);
  }

  // ---- VERIFY 2 SAMPLES ---------------------------------------------
  console.log('\n=== Post-Apply Verification (sample docs) ===');
  const after = await Promise.all(sampleIds.map(id => Product.findById(id).lean()));
  const FIELDS_TO_CHECK = [
    'name', 'slug', 'sku', 'description', 'tagline', 'shortDescription',
    'sections', 'productCategories', 'category', 'sizes', 'colors',
    'image', 'imagePublicId', 'imageTrackingCode', 'subImages',
    'seo', 'isActive', 'bestSeller', 'newArrival', 'featured', 'trending',
    'mostPopular', 'rating', 'reviews', 'details', 'customFields',
    'price', 'stock', 'minOrderQuantity', 'productType', 'createdAt', 'updatedAt',
  ];

  for (let i = 0; i < after.length; i++) {
    const before = snapshotsBefore[i];
    const aft = after[i];
    console.log(`\nSample: ${aft._id}`);
    console.log(`  title: "${before.title}"`);
    console.log(`      →  "${aft.title}"`);
    console.log(`  title has / or + : ${/[/+]/.test(aft.title) ? 'YES ✗' : 'no ✓'}`);
    let allOk = true;
    for (const f of FIELDS_TO_CHECK) {
      if (JSON.stringify(before[f]) === JSON.stringify(aft[f])) {
        console.log(`  field ${f.padEnd(20)} unchanged: ✓`);
      } else {
        console.log(`  field ${f.padEnd(20)} CHANGED!`);
        allOk = false;
      }
    }
    console.log(allOk ? `  → all non-title fields preserved ✓` : `  → DIFFERENCES DETECTED ✗`);
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB.\n');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
