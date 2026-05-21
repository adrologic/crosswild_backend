const SiteSettings = require('../models/SiteSettings');
const { uploadToImgBB } = require('../utils/imgbbUpload');

const FOLDER = 'general';

// Upload base64 image and write { url, trackingCode, publicId } back into the target object.
async function uploadIfBase64(target, baseKey, imageDataKey = `${baseKey}Data`) {
  if (!target) return;
  const imageData = target[imageDataKey];
  if (!imageData) return;
  const result = await uploadToImgBB(imageData, 'base64', FOLDER);
  target[baseKey] = result.url;
  target[`${baseKey}TrackingCode`] = result.trackingCode;
  target[`${baseKey}PublicId`] = result.publicId;
  delete target[imageDataKey];
}

// @desc    Get site settings (singleton; creates if missing)
// @route   GET /api/site-settings
// @access  Public
exports.getSiteSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update site settings (singleton)
// @route   PUT /api/site-settings
// @access  Private/Admin
exports.updateSiteSettings = async (req, res) => {
  try {
    const body = { ...req.body };

    // Handle base64 uploads for header.logo, footer.logo, layoutMeta.faviconIco, layoutMeta.appleTouchIcon
    if (body.header) {
      await uploadIfBase64(body.header, 'logo');
    }
    if (body.footer) {
      await uploadIfBase64(body.footer, 'logo');
    }
    if (body.layoutMeta) {
      await uploadIfBase64(body.layoutMeta, 'faviconIco');
      await uploadIfBase64(body.layoutMeta, 'appleTouchIcon');
    }

    // Force singleton key
    body.key = 'default';

    const settings = await SiteSettings.findOneAndUpdate(
      { key: 'default' },
      body,
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, message: 'Site settings updated', settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
