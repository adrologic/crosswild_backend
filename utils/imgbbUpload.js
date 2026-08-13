const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const r2 = require('./r2Storage');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Where new uploads go. Cloudinary stays the default so nothing changes until
// the R2 variables are deliberately set. Existing images already moved to R2 by
// scripts/migrate-cloudinary-to-r2.js keep working either way — the database
// holds absolute URLs, and Cloudinary is never deleted from.
const useR2 = () => process.env.STORAGE_DRIVER === 'r2';

/** Strip a data URI down to raw bytes. Uploads arrive base64 from routes/upload.js. */
const bufferFromImageData = (imageData) => {
  const base64 = imageData.startsWith('data:') ? imageData.split(',')[1] : imageData;
  return Buffer.from(base64, 'base64');
};

/**
 * Generate a unique tracking code
 * Format: CW-{CATEGORY}-{TIMESTAMP_SHORT}-{RANDOM_4}
 * Example: CW-TSHIRTS-3A7F1K-X9D2
 */
const generateTrackingCode = (folder = 'general') => {
  const prefix = 'CW';
  const categoryPart = folder
    .replace('crosswild/', '')
    .replace(/\//g, '-')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .substring(0, 12);
  const timePart = Date.now().toString(36).toUpperCase().slice(-6);
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${categoryPart}-${timePart}-${randomPart}`;
};

/**
 * Get Cloudinary folder path based on category
 * Maps product categories to organized folder structure
 */
const getCategoryFolder = (category) => {
  const folderMap = {
    // Product categories
    'tshirts': 'crosswild/products/tshirts',
    't-shirts': 'crosswild/products/tshirts',
    'bags': 'crosswild/products/bags',
    'caps': 'crosswild/products/caps',
    'sweatshirts': 'crosswild/products/sweatshirts-hoodies',
    'sweatshirts-hoodies': 'crosswild/products/sweatshirts-hoodies',
    'lower-shorts': 'crosswild/products/lower-shorts',
    'lowers': 'crosswild/products/lower-shorts',
    'school-office-uniform': 'crosswild/products/uniforms',
    'uniforms': 'crosswild/products/uniforms',
    'printing-embroidery': 'crosswild/products/printing-embroidery',
    'printing': 'crosswild/products/printing-embroidery',
    'apron': 'crosswild/products/apron',
    'chef-coat': 'crosswild/products/chef-coat',
    'raincoats': 'crosswild/products/raincoats',
    // Non-product categories
    'blogs': 'crosswild/blogs',
    'authors': 'crosswild/blogs/authors',
    'seo': 'crosswild/seo',
    'banners': 'crosswild/banners',
    'general': 'crosswild/general',
  };

  const key = (category || 'general').toLowerCase().trim();
  return folderMap[key] || `crosswild/products/${key}`;
};

/**
 * Upload image to Cloudinary with folder structure and tracking code
 * @param {string} imageData - File path or base64 data URI
 * @param {string} imageType - 'file' or 'base64'
 * @param {string} folder - Category or folder name
 * @returns {Promise<{url: string, trackingCode: string, publicId: string}>}
 */
const uploadToImgBB = async (imageData, imageType = 'file', folder = 'general') => {
  try {
    const resolvedFolder = getCategoryFolder(folder);
    const trackingCode = generateTrackingCode(resolvedFolder);

    if (useR2()) {
      const key = r2.buildKey(resolvedFolder, trackingCode);
      const { url } = await r2.putImage(bufferFromImageData(imageData), key);
      // publicId carries the R2 key so deleteImage() can remove the object.
      return { url, trackingCode, publicId: key };
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary credentials not configured');
    }

    let uploadData = imageData;

    if (imageType === 'base64') {
      if (!imageData.startsWith('data:')) {
        uploadData = `data:image/png;base64,${imageData}`;
      }
    }

    const result = await cloudinary.uploader.upload(uploadData, {
      folder: resolvedFolder,
      public_id: trackingCode,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      trackingCode,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary Upload Error:', error.message);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

/**
 * Upload image from URL to Cloudinary
 * @param {string} imageUrl - External image URL
 * @param {string} folder - Category or folder name
 * @returns {Promise<{url: string, trackingCode: string, publicId: string}>}
 */
const uploadFromUrl = async (imageUrl, folder = 'general') => {
  try {
    const resolvedFolder = getCategoryFolder(folder);
    const trackingCode = generateTrackingCode(resolvedFolder);

    if (useR2()) {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`Could not fetch ${imageUrl} — HTTP ${res.status}`);
      const key = r2.buildKey(resolvedFolder, trackingCode);
      const { url } = await r2.putImage(Buffer.from(await res.arrayBuffer()), key);
      return { url, trackingCode, publicId: key };
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary credentials not configured');
    }

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: resolvedFolder,
      public_id: trackingCode,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    return {
      url: result.secure_url,
      trackingCode,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary Upload Error:', error.message);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary by public_id or URL
 * @param {string} identifier - Cloudinary public_id or full URL
 */
const deleteImage = async (identifier) => {
  try {
    if (!identifier) return;

    // Route by where the image actually lives, not by the current driver — after
    // the R2 migration both kinds of reference exist in the database, and old
    // Cloudinary URLs must still be deletable.
    if (r2.isR2Reference(identifier)) return r2.removeImage(identifier);

    let publicId = identifier;

    // If it's a URL, extract the public_id
    if (identifier.startsWith('http')) {
      const urlParts = identifier.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex === -1) return;
      const publicIdWithExt = urlParts.slice(uploadIndex + 2).join('/');
      publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
    }

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary Delete Error:', error.message);
  }
};

module.exports = {
  uploadToImgBB,
  uploadFromUrl,
  deleteImage,
  generateTrackingCode,
  getCategoryFolder,
  cloudinary,
};
