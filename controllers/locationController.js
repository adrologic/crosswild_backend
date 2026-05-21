const LocationPage = require('../models/LocationPage');
const { uploadToImgBB } = require('../utils/imgbbUpload');

const FOLDER = 'banners';

// Upload a single base64 imageData → URL, or pass through existing URL.
async function resolveImage(value) {
  if (!value) return '';
  if (typeof value === 'string') return value; // already a URL or path
  if (typeof value === 'object' && value.imageData) {
    const result = await uploadToImgBB(value.imageData, 'base64', FOLDER);
    return result.url;
  }
  return '';
}

// Normalize an array that may contain mixed strings + { imageData } objects.
async function resolveImageArray(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const item of arr) {
    if (!item) continue;
    if (typeof item === 'string') {
      out.push(item);
    } else if (item.imageData) {
      const result = await uploadToImgBB(item.imageData, 'base64', FOLDER);
      out.push(result.url);
    } else if (item.url) {
      out.push(item.url);
    }
  }
  return out;
}

async function handleLocationImages(body) {
  // Hero image — either body.image (string URL) or body.imageData (base64)
  if (body.imageData) {
    const result = await uploadToImgBB(body.imageData, 'base64', FOLDER);
    body.image = result.url;
    delete body.imageData;
  }

  // pageImages / sliderImages can be supplied as pageImagesData/sliderImagesData
  // (array of { imageData }) or already as a string-URL array.
  if (Array.isArray(body.pageImagesData)) {
    const uploaded = await resolveImageArray(body.pageImagesData);
    body.pageImages = [...(Array.isArray(body.pageImages) ? body.pageImages : []), ...uploaded];
    delete body.pageImagesData;
  }
  if (Array.isArray(body.sliderImagesData)) {
    const uploaded = await resolveImageArray(body.sliderImagesData);
    body.sliderImages = [...(Array.isArray(body.sliderImages) ? body.sliderImages : []), ...uploaded];
    delete body.sliderImagesData;
  }

  // If existing arrays contain { imageData } items (mixed), upload them.
  if (Array.isArray(body.pageImages)) {
    body.pageImages = await resolveImageArray(body.pageImages);
  }
  if (Array.isArray(body.sliderImages)) {
    body.sliderImages = await resolveImageArray(body.sliderImages);
  }
  return body;
}

// @desc    Get all locations
// @route   GET /api/locations
// @access  Public
exports.getAllLocations = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active === 'true') query.isActive = true;

    const locations = await LocationPage.find(query).sort({ isHeadquarters: -1, name: 1 }).lean();
    res.json({ success: true, locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single location by slug or id
// @route   GET /api/locations/:slug
// @access  Public
exports.getLocation = async (req, res) => {
  try {
    const { slug } = req.params;
    let location;

    if (slug.match(/^[0-9a-fA-F]{24}$/)) {
      location = await LocationPage.findById(slug).lean();
    }
    if (!location) {
      location = await LocationPage.findOne({ slug }).lean();
    }

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    res.json({ success: true, location });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create location
// @route   POST /api/locations
// @access  Private/Admin
exports.createLocation = async (req, res) => {
  try {
    const body = await handleLocationImages({ ...req.body });
    const location = await LocationPage.create(body);
    res.status(201).json({ success: true, message: 'Location created successfully', location });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private/Admin
exports.updateLocation = async (req, res) => {
  try {
    const body = await handleLocationImages({ ...req.body });
    const location = await LocationPage.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    );
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    res.json({ success: true, message: 'Location updated successfully', location });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private/Admin
exports.deleteLocation = async (req, res) => {
  try {
    const location = await LocationPage.findByIdAndDelete(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    res.json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Seed locations from hardcoded data
// @route   POST /api/locations/seed
// @access  Private/Admin
exports.seedLocations = async (req, res) => {
  try {
    const { locations } = req.body;
    if (!locations || !Array.isArray(locations)) {
      return res.status(400).json({ success: false, message: 'locations array required' });
    }

    const results = [];
    for (const loc of locations) {
      const existing = await LocationPage.findOne({ slug: loc.slug });
      if (existing) {
        await LocationPage.findOneAndUpdate({ slug: loc.slug }, loc, { new: true });
        results.push({ slug: loc.slug, action: 'updated' });
      } else {
        await LocationPage.create(loc);
        results.push({ slug: loc.slug, action: 'created' });
      }
    }

    res.json({ success: true, message: `Seeded ${results.length} locations`, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
