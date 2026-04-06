const LocationPage = require('../models/LocationPage');

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
    const location = await LocationPage.create(req.body);
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
    const location = await LocationPage.findByIdAndUpdate(
      req.params.id,
      req.body,
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
        const updated = await LocationPage.findOneAndUpdate({ slug: loc.slug }, loc, { new: true });
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
