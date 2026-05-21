const PageContent = require('../models/PageContent');
const { uploadToImgBB } = require('../utils/imgbbUpload');

// Recursively walk an arbitrary `data` blob. Anywhere we encounter an object with
// an `imageData` (base64) key, upload it through Cloudinary and replace the key
// with `image` (URL) + tracking/public ids. Pure string image paths are left alone.
async function walkAndUploadImages(node, folder = 'banners') {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = await walkAndUploadImages(node[i], folder);
    }
    return node;
  }
  if (node && typeof node === 'object') {
    if (typeof node.imageData === 'string' && node.imageData.length > 0) {
      try {
        const result = await uploadToImgBB(node.imageData, 'base64', folder);
        // Common conventions: store URL under `image` or `src` whichever already exists.
        if ('src' in node) {
          node.src = result.url;
        } else {
          node.image = result.url;
        }
        node.imageTrackingCode = result.trackingCode;
        node.imagePublicId = result.publicId;
        delete node.imageData;
      } catch (err) {
        // Surface upload failure but keep walking other fields.
        throw new Error(`Image upload failed inside page content: ${err.message}`);
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'imageData') continue;
      node[key] = await walkAndUploadImages(node[key], folder);
    }
    return node;
  }
  return node;
}

// GET /api/content/:pageSlug — all sections for a page
exports.getPageContent = async (req, res) => {
  try {
    const sections = await PageContent.find({
      pageSlug: req.params.pageSlug,
      isActive: true,
    }).select('-__v');

    const result = {};
    sections.forEach((s) => {
      result[s.sectionKey] = s.data;
    });

    res.json({ success: true, content: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/content/:pageSlug/:sectionKey — single section
exports.getSection = async (req, res) => {
  try {
    const section = await PageContent.findOne({
      pageSlug: req.params.pageSlug,
      sectionKey: req.params.sectionKey,
      isActive: true,
    });

    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.json({ success: true, data: section.data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/content/:pageSlug/:sectionKey — upsert a section (admin)
exports.upsertSection = async (req, res) => {
  try {
    let data = req.body.data;
    if (data && typeof data === 'object') {
      data = await walkAndUploadImages(data, 'banners');
    }

    const section = await PageContent.findOneAndUpdate(
      { pageSlug: req.params.pageSlug, sectionKey: req.params.sectionKey },
      { $set: { data, isActive: true } },
      { upsert: true, new: true }
    );
    res.json({ success: true, section });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/content — list all pages (admin)
exports.getAllPages = async (req, res) => {
  try {
    const pages = await PageContent.aggregate([
      { $group: { _id: '$pageSlug', sections: { $push: '$sectionKey' }, updatedAt: { $max: '$updatedAt' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, pages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/content/:pageSlug/:sectionKey (admin)
exports.deleteSection = async (req, res) => {
  try {
    await PageContent.findOneAndDelete({
      pageSlug: req.params.pageSlug,
      sectionKey: req.params.sectionKey,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
