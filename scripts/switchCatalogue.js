/**
 * STEP 4 — the switch-over. The only step a visitor can see.
 *
 *   node scripts/switchCatalogue.js              # dry run (default, no writes)
 *   node scripts/switchCatalogue.js --apply      # do it
 *   node scripts/switchCatalogue.js --undo       # put it back exactly as it was
 *
 * Publishes the 133 rebuilt products and takes the old ones off the site, in
 * that order, so the shop is never empty for even a moment.
 *
 * NOTHING IS DELETED. The old products are hidden (isActive:false) and keep all
 * their data, so --undo restores the previous state exactly. Deleting them for
 * good is a separate, later, deliberate step.
 *
 * Before it writes anything it re-checks that the new products are actually
 * complete — right count, a code and a photo each — because publishing a broken
 * catalogue is worse than publishing nothing.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { connectVerified } = require('../utils/liveDb');

const PROGRESS_PATH = path.join(__dirname, '.upload-progress.json');
const STATE_PATH = path.join(__dirname, '.switch-state.json');

const argValue = (flag) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : null;
};
const APPLY = process.argv.includes('--apply');
const UNDO = process.argv.includes('--undo');
// Without --host this targets the database named in .env (the old Atlas copy).
// --host points it at the live one through a tunnel or Coolify's public port.
const HOST = argValue('--host');

async function connect() {
  await connectVerified({
    hostOverride: HOST,
    verifyUrl: argValue('--verify-url'),
    skipVerify: process.argv.includes('--skip-live-check'),
    useProduction: !!HOST,
  });
}

async function undo() {
  if (!fs.existsSync(STATE_PATH)) {
    console.error('No .switch-state.json — there is no recorded switch to undo.');
    process.exit(1);
  }
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  console.log(`Undoing the switch made at ${state.switchedAt}`);
  console.log(`  re-hiding  ${state.published.length} new products`);
  console.log(`  restoring  ${state.hidden.length} old products to live`);

  if (!APPLY) {
    console.log('\nDRY RUN — re-run with --undo --apply to actually revert.');
    return;
  }
  const a = await Product.updateMany({ _id: { $in: state.published } }, { $set: { isActive: false } });
  const b = await Product.updateMany({ _id: { $in: state.hidden } }, { $set: { isActive: true } });
  console.log(`\nReverted: ${a.modifiedCount} new hidden again, ${b.modifiedCount} old back live.`);
  fs.renameSync(STATE_PATH, STATE_PATH + '.reverted');
}

async function run() {
  await connect();

  if (UNDO) {
    await undo();
    await mongoose.disconnect();
    return;
  }

  const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  const newIds = Object.values(progress.done)
    .filter((d) => d.productId && !d.skipped)
    .map((d) => d.productId);

  const newProducts = await Product.find({ _id: { $in: newIds } })
    .select('name sku image isActive subImages')
    .lean();
  const oldProducts = await Product.find({ _id: { $nin: newIds }, isActive: true })
    .select('name slug')
    .lean();

  // Refuse to publish a catalogue that isn't whole.
  const problems = [];
  if (newProducts.length !== newIds.length) {
    problems.push(`expected ${newIds.length} new products, found ${newProducts.length} in the database`);
  }
  const noCode = newProducts.filter((p) => !/^CW\d{4}$/.test(p.sku || ''));
  if (noCode.length) problems.push(`${noCode.length} new product(s) have no valid product code`);
  const noImage = newProducts.filter((p) => !p.image);
  if (noImage.length) problems.push(`${noImage.length} new product(s) have no main image`);
  const dupCodes = newProducts.length - new Set(newProducts.map((p) => p.sku)).size;
  if (dupCodes > 0) problems.push(`${dupCodes} duplicate product code(s) among the new products`);

  console.log(`New products to publish : ${newProducts.length}`);
  console.log(`Old products to hide    : ${oldProducts.length}`);
  console.log(`Mode                    : ${APPLY ? 'APPLY — will change the live site' : 'DRY RUN — no writes'}`);

  if (problems.length) {
    console.error('\nBLOCKED:\n' + problems.map((p) => `  • ${p}`).join('\n'));
    console.error('\nNothing was changed.');
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!APPLY) {
    console.log('\nWould publish, first five:');
    newProducts.slice(0, 5).forEach((p) => console.log(`  ${p.sku}  ${p.name}`));
    console.log('\nWould hide, first five:');
    oldProducts.slice(0, 5).forEach((p) => console.log(`  ${p.name}  (/products/${p.slug})`));
    console.log('\nDRY RUN — nothing was changed. Re-run with --apply.');
    await mongoose.disconnect();
    return;
  }

  // Record what we are about to do BEFORE doing it, so --undo always has a map
  // even if the process dies halfway through.
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify(
      {
        switchedAt: new Date().toISOString(),
        published: newProducts.map((p) => String(p._id)),
        hidden: oldProducts.map((p) => String(p._id)),
        note: 'Old products are hidden, not deleted. Run --undo --apply to revert.',
      },
      null,
      1
    )
  );

  // Publish first, hide second — in that order the shop is never empty.
  const pub = await Product.updateMany({ _id: { $in: newProducts.map((p) => p._id) } }, { $set: { isActive: true } });
  console.log(`\nPublished ${pub.modifiedCount} new products.`);

  const hid = await Product.updateMany({ _id: { $in: oldProducts.map((p) => p._id) } }, { $set: { isActive: false } });
  console.log(`Hid ${hid.modifiedCount} old products (hidden, NOT deleted).`);

  const live = await Product.countDocuments({ isActive: true });
  const hidden = await Product.countDocuments({ isActive: false });
  console.log(`\nLive now  : ${live}`);
  console.log(`Hidden now: ${hidden}`);
  console.log(`\nState written to ${STATE_PATH}`);
  console.log('To put everything back exactly as it was:');
  console.log('  node scripts/switchCatalogue.js --undo --apply');

  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('\nFATAL:', e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
