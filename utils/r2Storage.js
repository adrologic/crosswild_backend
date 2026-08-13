/**
 * Cloudflare R2 storage (S3-compatible).
 *
 * R2 is plain object storage — unlike Cloudinary it cannot transform on
 * delivery, so images are converted to WebP here, once, at upload time. That
 * matches how the existing library was migrated (see
 * scripts/migrate-cloudinary-to-r2.js) and keeps the page weight where
 * Cloudinary's f_auto/q_auto had it.
 *
 * Selected with STORAGE_DRIVER=r2. Required env:
 *   R2_ACCOUNT_ID  R2_ACCESS_KEY_ID  R2_SECRET_ACCESS_KEY  R2_BUCKET
 *   R2_PUBLIC_BASE   e.g. https://pub-xxxx.r2.dev
 *   R2_KEY_PREFIX    e.g. CrossWild  (the bucket is shared with another site)
 */
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const WEBP_QUALITY = 82; // visually lossless for product photography

let client = null;

function getClient() {
  if (client) return client;

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('STORAGE_DRIVER=r2 but R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not set');
  }

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    // R2 only supports path-style addressing. Without this the SDK builds
    // virtual-hosted URLs and every upload fails with SignatureDoesNotMatch.
    forcePathStyle: true,
  });
  return client;
}

const isR2Reference = (value) =>
  typeof value === 'string' &&
  (value.startsWith(`${(process.env.R2_KEY_PREFIX || '').replace(/\/+$/, '')}/`) ||
    (process.env.R2_PUBLIC_BASE && value.startsWith(process.env.R2_PUBLIC_BASE)));

function urlFor(key) {
  return `${(process.env.R2_PUBLIC_BASE || '').replace(/\/+$/, '')}/${key}`;
}

/**
 * Object key for an upload. Mirrors the layout the migration produced, so
 * migrated and newly uploaded images sit side by side:
 *   CrossWild/products/tshirts/CW-PRODUCTS-TSHIRTS-M653QB-EE05.webp
 *
 * @param {string} folder  resolved folder, e.g. 'crosswild/products/tshirts'
 * @param {string} trackingCode
 */
function buildKey(folder, trackingCode) {
  const prefix = (process.env.R2_KEY_PREFIX || '').replace(/^\/+|\/+$/g, '');
  // Cloudinary namespaced everything under `crosswild/`; the R2 prefix already
  // plays that role, and keeping both would give CrossWild/crosswild/...
  const withoutVendorFolder = folder.replace(/^crosswild\//i, '').replace(/^\/+|\/+$/g, '');
  return `${prefix}/${withoutVendorFolder}/${trackingCode}.webp`;
}

/**
 * Convert to WebP and store.
 *
 * @param {Buffer} buffer  original image bytes
 * @param {string} key     destination object key
 * @returns {Promise<{url: string, key: string, size: number}>}
 */
async function putImage(buffer, key) {
  const webp = await sharp(buffer, { animated: true })
    // Phones write orientation to EXIF rather than rotating pixels, and WebP
    // output drops EXIF — without this, portrait photos come out sideways.
    .rotate()
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  await getClient().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: webp,
    ContentType: 'image/webp',
    // Keys carry a unique tracking code and are never overwritten in place, so
    // an immutable year is safe and keeps R2 egress near zero.
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return { url: urlFor(key), key, size: webp.length };
}

/**
 * Delete an object, given either its key or its public URL. Silent on a missing
 * object — callers delete on a best-effort basis.
 */
async function removeImage(identifier) {
  const base = (process.env.R2_PUBLIC_BASE || '').replace(/\/+$/, '');
  const key = identifier.startsWith('http')
    ? identifier.replace(`${base}/`, '')
    : identifier.replace(/^\/+/, '');

  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
  } catch (error) {
    console.error('R2 Delete Error:', error.message);
  }
}

module.exports = { putImage, removeImage, buildKey, urlFor, isR2Reference };
