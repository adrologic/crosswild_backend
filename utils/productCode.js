const crypto = require('crypto');

// Public-facing product code: "CW" + 4 digits (CW0000 – CW9999).
//
// Deliberately RANDOM, not sequential. A sequential code would tell any buyer
// who reads two of them how many products the catalogue holds and how fast it
// grows. Short enough that a buyer can read it off a photo and type it back
// over WhatsApp, and permanent once issued — never regenerate a code that has
// already been given to a customer.
const PRODUCT_CODE_PREFIX = 'CW';
const PRODUCT_CODE_DIGITS = 4;
const PRODUCT_CODE_SPACE = 10 ** PRODUCT_CODE_DIGITS;
const PRODUCT_CODE_REGEX = /^CW\d{4}$/;

// Name of the unique index that arbitrates codes (see models/Product.js and
// scripts/backfillProductCodes.js).
const PRODUCT_CODE_INDEX = 'sku_unique';
const LEGACY_SKU_INDEX = 'sku_1';

// A collision just costs one wasted insert, so a generous cap still fails fast
// relative to the 10,000-code space.
const MAX_ATTEMPTS = 25;

function generateProductCode() {
  const n = crypto.randomInt(0, PRODUCT_CODE_SPACE);
  return PRODUCT_CODE_PREFIX + String(n).padStart(PRODUCT_CODE_DIGITS, '0');
}

function isValidProductCode(value) {
  return typeof value === 'string' && PRODUCT_CODE_REGEX.test(value.trim().toUpperCase());
}

// True only for a duplicate-key error raised by the sku index. Products also
// carry a unique index on `slug`, and retrying a fresh code would silently
// spin 25 times on a slug clash and then report the wrong cause.
function isProductCodeDuplicateError(err) {
  if (!err || err.code !== 11000) return false;
  if (err.keyPattern && Object.prototype.hasOwnProperty.call(err.keyPattern, 'sku')) return true;
  if (err.keyValue && Object.prototype.hasOwnProperty.call(err.keyValue, 'sku')) return true;
  // Older drivers only put the index name in the message.
  return typeof err.message === 'string' && err.message.includes(PRODUCT_CODE_INDEX);
}

function codeSpaceExhaustedError() {
  return new Error(
    `Could not issue a unique product code after ${MAX_ATTEMPTS} attempts — ` +
    `the ${PRODUCT_CODE_PREFIX}#### code space is full. Widen the format ` +
    `(e.g. ${PRODUCT_CODE_PREFIX} + 5 digits) in utils/productCode.js and re-run ` +
    `the backfill script.`
  );
}

// Generate-then-insert, NOT check-then-insert: a find() followed by an insert
// races two concurrent imports into the same code. The unique index is the
// arbiter — a collision costs one wasted attempt and we draw again.
async function saveWithProductCode(doc) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (!isValidProductCode(doc.sku)) doc.sku = generateProductCode();
    try {
      return await doc.save();
    } catch (err) {
      if (!isProductCodeDuplicateError(err)) throw err;
      doc.sku = ''; // force a fresh draw on the next pass
    }
  }
  throw codeSpaceExhaustedError();
}

// Create a product document with a guaranteed-unique code.
async function createProductWithCode(Model, data) {
  return saveWithProductCode(new Model(data));
}

// Stamp a code onto a product that has none, without touching any other field.
// Uses the raw collection so legacy documents that would fail today's schema
// validation still get a code (a backfill must never rewrite product content).
// Returns the issued code, or the existing one if the product already has it.
async function ensureProductCode(Model, id) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateProductCode();
    try {
      const result = await Model.collection.updateOne(
        { _id: id, $or: [{ sku: { $in: ['', null] } }, { sku: { $exists: false } }] },
        { $set: { sku: code } }
      );
      if (result.matchedCount === 0) {
        // Someone else issued a code first (or the id is gone) — report theirs.
        const current = await Model.collection.findOne({ _id: id }, { projection: { sku: 1 } });
        return current ? current.sku : null;
      }
      return code;
    } catch (err) {
      if (!isProductCodeDuplicateError(err)) throw err;
    }
  }
  throw codeSpaceExhaustedError();
}

module.exports = {
  PRODUCT_CODE_PREFIX,
  PRODUCT_CODE_DIGITS,
  PRODUCT_CODE_REGEX,
  PRODUCT_CODE_INDEX,
  LEGACY_SKU_INDEX,
  MAX_ATTEMPTS,
  generateProductCode,
  isValidProductCode,
  isProductCodeDuplicateError,
  saveWithProductCode,
  createProductWithCode,
  ensureProductCode,
};
